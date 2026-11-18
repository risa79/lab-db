const express = require('express');
const { UniqueConstraintError, ForeignKeyConstraintError, ValidationError } = require('sequelize');
const { sequelize, Course, Teacher, Student, Enrollment } = require('./db');

const app = express();
app.use(express.json());

// ---------- Вспомогательные функции ----------

// Положительное целое число (для id, hours и т.п.)
const isPosInt = (v) => Number.isInteger(v) && v > 0;

// Разбор :id из URL; null, если это не положительное целое
function parseId(raw) {
  const n = Number(raw);
  return /^\d+$/.test(raw) && isPosInt(n) ? n : null;
}

// Проверка тела запроса для курса. partial = true для PUT (поля необязательны)
function validateCourse(body, partial = false) {
  const errors = [];
  const has = (k) => body[k] !== undefined;

  if (!partial || has('title')) {
    if (typeof body.title !== 'string' || body.title.trim() === '') errors.push('title: непустая строка');
  }
  if (!partial || has('hours')) {
    if (!isPosInt(body.hours)) errors.push('hours: целое число больше 0');
  }
  if (!partial || has('teacherId')) {
    if (!isPosInt(body.teacherId)) errors.push('teacherId: положительное целое');
  }
  if (has('description') && body.description !== null && typeof body.description !== 'string') {
    errors.push('description: строка или null');
  }
  if (partial && !['title', 'hours', 'teacherId', 'description'].some(has)) {
    errors.push('нет полей для обновления (title, description, hours, teacherId)');
  }
  return errors;
}

// Обёртка для async-обработчиков: ошибки уходят в общий обработчик ниже
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Только разрешённые поля курса (защита от лишних полей, например id)
const pickCourse = ({ title, description, hours, teacherId }) =>
  Object.fromEntries(Object.entries({ title, description, hours, teacherId }).filter(([, v]) => v !== undefined));

// ---------- Курсы ----------

// GET /courses — все курсы с преподавателем
app.get('/courses', wrap(async (req, res) => {
  const courses = await Course.findAll({ include: Teacher, order: [['id', 'ASC']] });
  res.json(courses);
}));

// GET /courses/:id — один курс
app.get('/courses/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id должен быть положительным целым числом' });

  const course = await Course.findByPk(id, { include: Teacher });
  if (!course) return res.status(404).json({ error: `Курс ${id} не найден` });
  res.json(course);
}));

// POST /courses — создать курс
app.post('/courses', wrap(async (req, res) => {
  const errors = validateCourse(req.body);
  if (errors.length) return res.status(400).json({ errors });

  if (!(await Teacher.findByPk(req.body.teacherId))) {
    return res.status(400).json({ error: `Преподаватель ${req.body.teacherId} не существует` });
  }
  const course = await Course.create(pickCourse(req.body));
  res.status(201).json(course);
}));

// PUT /courses/:id — изменить курс (можно передать только часть полей)
app.put('/courses/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id должен быть положительным целым числом' });

  const errors = validateCourse(req.body, true);
  if (errors.length) return res.status(400).json({ errors });

  const course = await Course.findByPk(id);
  if (!course) return res.status(404).json({ error: `Курс ${id} не найден` });

  if (req.body.teacherId !== undefined && !(await Teacher.findByPk(req.body.teacherId))) {
    return res.status(400).json({ error: `Преподаватель ${req.body.teacherId} не существует` });
  }
  await course.update(pickCourse(req.body));
  res.json(course);
}));

// DELETE /courses/:id — удалить курс (записи удалятся каскадно, ON DELETE CASCADE)
app.delete('/courses/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id должен быть положительным целым числом' });

  const deleted = await Course.destroy({ where: { id } });
  if (!deleted) return res.status(404).json({ error: `Курс ${id} не найден` });
  res.json({ message: `Курс ${id} удалён` });
}));

// ---------- Записи на курсы ----------

// POST /enrollments — записать студента на курс { studentId, courseId, grade? }
app.post('/enrollments', wrap(async (req, res) => {
  const { studentId, courseId, grade } = req.body;
  const errors = [];
  if (!isPosInt(studentId)) errors.push('studentId: положительное целое');
  if (!isPosInt(courseId)) errors.push('courseId: положительное целое');
  if (grade !== undefined && grade !== null && !(Number.isInteger(grade) && grade >= 0 && grade <= 100)) {
    errors.push('grade: целое от 0 до 100 или null');
  }
  if (errors.length) return res.status(400).json({ errors });

  if (!(await Student.findByPk(studentId))) return res.status(404).json({ error: `Студент ${studentId} не найден` });
  if (!(await Course.findByPk(courseId)))   return res.status(404).json({ error: `Курс ${courseId} не найден` });

  const enrollment = await Enrollment.create({ studentId, courseId, grade: grade ?? null });
  res.status(201).json(enrollment); // повторная запись -> UniqueConstraintError -> 409
}));

// ---------- Студенты ----------

// GET /students/:id/courses — курсы студента с оценками
app.get('/students/:id/courses', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'id должен быть положительным целым числом' });

  const student = await Student.findByPk(id, {
    include: {
      model: Course,
      through: { attributes: ['grade', 'enrolledAt'] },
      include: { model: Teacher, attributes: ['id', 'fullName'] }
    },
    order: [[Course, 'id', 'ASC']]
  });
  if (!student) return res.status(404).json({ error: `Студент ${id} не найден` });

  res.json({
    student: { id: student.id, fullName: student.fullName, groupName: student.groupName },
    courses: student.Courses.map((c) => ({
      id: c.id,
      title: c.title,
      hours: c.hours,
      teacher: c.Teacher ? c.Teacher.fullName : null,
      grade: c.Enrollment.grade,
      enrolledAt: c.Enrollment.enrolledAt
    }))
  });
}));

// ---------- Ошибки ----------

app.use((req, res) => res.status(404).json({ error: 'Маршрут не найден' }));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Некорректный JSON' });
  if (err instanceof UniqueConstraintError) return res.status(409).json({ error: 'Такая запись уже существует' });
  if (err instanceof ForeignKeyConstraintError) return res.status(409).json({ error: 'Нарушение внешнего ключа' });
  if (err instanceof ValidationError) {
    return res.status(400).json({ errors: err.errors.map((e) => `${e.path}: ${e.message}`) });
  }
  // Нарушение CHECK в БД (код 23514)
  if (err.parent && err.parent.code === '23514') return res.status(400).json({ error: 'Нарушено ограничение CHECK' });
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const PORT = process.env.PORT || 3000;
sequelize.authenticate()
  .then(() => app.listen(PORT, () => console.log(`http://localhost:${PORT}/courses`)))
  .catch((err) => { console.error('Нет подключения к БД:', err.message); process.exit(1); });

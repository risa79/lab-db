// Проверка моделей Sequelize: node src/test.js
const { sequelize, Teacher, Course, Student, Enrollment } = require('./db');

async function main() {
  await sequelize.authenticate();
  console.log('Подключение к БД установлено\n');

  // 1. Курсы вместе с преподавателями (include)
  console.log('--- Курсы и преподаватели ---');
  const courses = await Course.findAll({ include: Teacher, order: [['id', 'ASC']] });
  for (const c of courses) {
    console.log(`${c.id}. ${c.title} (${c.hours} ч) — ${c.Teacher.fullName}`);
  }

  // 2. Студенты курса с оценками (belongsToMany, оценка лежит в Enrollment)
  const course = await Course.findByPk(1, {
    include: { model: Student, through: { attributes: ['grade', 'enrolledAt'] } }
  });
  console.log(`\n--- Студенты курса «${course.title}» ---`);
  for (const s of course.Students) {
    console.log(`${s.fullName} (${s.groupName}): ${s.Enrollment.grade ?? 'нет оценки'}`);
  }

  // 3. Добавить студента (findOrCreate — чтобы скрипт можно было запускать повторно)
  const [student, created] = await Student.findOrCreate({
    where: { email: 'test.student@mail.kz' },
    defaults: { fullName: 'Тестов Тест', groupName: 'ИС-24' }
  });
  console.log(`\nСтудент ${created ? 'добавлен' : 'уже был'}: id=${student.id}, ${student.fullName}`);

  // Записываем его на курс 1, чтобы было что менять и удалять
  await Enrollment.findOrCreate({ where: { studentId: student.id, courseId: 1 } });

  // 4. Изменить оценку
  const [updated] = await Enrollment.update(
    { grade: 77 },
    { where: { studentId: student.id, courseId: 1 } }
  );
  const e = await Enrollment.findOne({ where: { studentId: student.id, courseId: 1 } });
  console.log(`Оценка изменена (строк: ${updated}), теперь: ${e.grade}`);

  // 5. Удалить запись на курс, затем самого тестового студента
  const removed = await Enrollment.destroy({ where: { studentId: student.id, courseId: 1 } });
  console.log(`Удалено записей на курс: ${removed}`);
  await student.destroy();
  console.log('Тестовый студент удалён');
}

main()
  .catch((err) => { console.error('Ошибка:', err.message); process.exitCode = 1; })
  .finally(() => sequelize.close());

require('dotenv').config({ quiet: true });
const { Sequelize, DataTypes } = require('sequelize');

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL не задан: создайте файл .env (см. README)');
}

const sequelize = new Sequelize(url, {
  dialect: 'postgres',
  logging: false,
  // Neon требует SSL; для локальной базы без sslmode=require SSL отключается
  dialectOptions: url.includes('sslmode=require') ? { ssl: { require: true } } : {}
});

// Общие опции: имя таблицы из schema.sql, snake_case колонки, без createdAt/updatedAt
const opts = (tableName) => ({ tableName, underscored: true, timestamps: false });

const Teacher = sequelize.define('Teacher', {
  fullName: { type: DataTypes.STRING(150), allowNull: false },
  email:    { type: DataTypes.STRING(150), allowNull: false, unique: true }
}, opts('teachers'));

const Course = sequelize.define('Course', {
  title:       { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  hours:       { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
  teacherId:   { type: DataTypes.INTEGER, allowNull: false }
}, opts('courses'));

const Student = sequelize.define('Student', {
  fullName:  { type: DataTypes.STRING(150), allowNull: false },
  email:     { type: DataTypes.STRING(150), allowNull: false, unique: true },
  groupName: { type: DataTypes.STRING(50),  allowNull: false }
}, opts('students'));

// Связующая таблица с составным первичным ключом (student_id, course_id)
const Enrollment = sequelize.define('Enrollment', {
  studentId:  { type: DataTypes.INTEGER, primaryKey: true },
  courseId:   { type: DataTypes.INTEGER, primaryKey: true },
  enrolledAt: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  grade:      { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0, max: 100 } }
}, opts('enrollments'));

// Один ко многим: преподаватель — курсы
Teacher.hasMany(Course, { foreignKey: 'teacherId' });
Course.belongsTo(Teacher, { foreignKey: 'teacherId' });

// Многие ко многим: студенты — курсы через Enrollment
Student.belongsToMany(Course, { through: Enrollment, foreignKey: 'studentId', otherKey: 'courseId' });
Course.belongsToMany(Student, { through: Enrollment, foreignKey: 'courseId', otherKey: 'studentId' });

// Прямые связи с Enrollment — удобно для запросов к самой связующей таблице
Enrollment.belongsTo(Student, { foreignKey: 'studentId' });
Enrollment.belongsTo(Course,  { foreignKey: 'courseId' });
Student.hasMany(Enrollment, { foreignKey: 'studentId' });
Course.hasMany(Enrollment,  { foreignKey: 'courseId' });

module.exports = { sequelize, Teacher, Course, Student, Enrollment };

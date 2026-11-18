-- Схема БД «Учебный центр»
-- Скрипт можно запускать повторно: сначала удаляем таблицы.

DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;

-- Преподаватели
CREATE TABLE teachers (
    id         SERIAL PRIMARY KEY,
    full_name  VARCHAR(150) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE
);

-- Курсы: у каждого курса ровно один преподаватель (связь 1:N)
CREATE TABLE courses (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    hours       INTEGER NOT NULL CHECK (hours > 0),
    teacher_id  INTEGER NOT NULL
                REFERENCES teachers(id) ON DELETE RESTRICT
);

-- Студенты
CREATE TABLE students (
    id          SERIAL PRIMARY KEY,
    full_name   VARCHAR(150) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    group_name  VARCHAR(50)  NOT NULL   -- "group" — зарезервированное слово SQL
);

-- Записи на курсы: связующая таблица для связи M:N студентов и курсов
CREATE TABLE enrollments (
    student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id    INTEGER NOT NULL REFERENCES courses(id)  ON DELETE CASCADE,
    enrolled_at  DATE    NOT NULL DEFAULT CURRENT_DATE,
    grade        INTEGER CHECK (grade BETWEEN 0 AND 100), -- NULL, пока оценки нет
    PRIMARY KEY (student_id, course_id)
);

-- Индекс по внешнему ключу (PostgreSQL не создаёт его автоматически)
CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);

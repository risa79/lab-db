-- Запросы к БД «Учебный центр»

-- 1. SELECT с WHERE, ORDER BY и LIMIT:
--    три самых длинных курса продолжительностью более 30 часов
SELECT id, title, hours
FROM courses
WHERE hours > 30
ORDER BY hours DESC
LIMIT 3;

-- 2. INNER JOIN: курсы вместе с их преподавателями
SELECT c.title AS course, c.hours, t.full_name AS teacher
FROM courses c
INNER JOIN teachers t ON t.id = c.teacher_id
ORDER BY c.title;

-- 3. LEFT JOIN: курсы, на которые никто не записан
SELECT c.id, c.title
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.id
WHERE e.course_id IS NULL;

-- 4. JOIN трёх таблиц: студент, курс, оценка
SELECT s.full_name AS student, c.title AS course, e.grade
FROM enrollments e
JOIN students s ON s.id = e.student_id
JOIN courses  c ON c.id = e.course_id
ORDER BY s.full_name, c.title;

-- 5. GROUP BY и HAVING: средняя оценка по курсам, только где она выше 70
--    (AVG игнорирует NULL, т.е. невыставленные оценки)
SELECT c.title, ROUND(AVG(e.grade), 1) AS avg_grade, COUNT(e.grade) AS graded
FROM courses c
JOIN enrollments e ON e.course_id = c.id
GROUP BY c.id, c.title
HAVING AVG(e.grade) > 70
ORDER BY avg_grade DESC;

-- 6. Подзапрос: студенты (и курсы), где оценка выше средней по всем записям
SELECT s.full_name, c.title, e.grade
FROM enrollments e
JOIN students s ON s.id = e.student_id
JOIN courses  c ON c.id = e.course_id
WHERE e.grade > (SELECT AVG(grade) FROM enrollments)
ORDER BY e.grade DESC;

-- 7a. UPDATE с условием: выставить оценку студенту 3 по курсу 4
UPDATE enrollments
SET grade = 81
WHERE student_id = 3 AND course_id = 4;

-- 7b. UPDATE с условием: увеличить длительность коротких курсов на 4 часа
UPDATE courses
SET hours = hours + 4
WHERE hours < 30;

-- 7c. DELETE с условием: удалить записи с оценкой ниже 60
DELETE FROM enrollments
WHERE grade < 60;

-- 8a. Транзакция с COMMIT: записать студента 5 на курс 1 и выставить оценку
BEGIN;
INSERT INTO enrollments (student_id, course_id) VALUES (5, 1);
UPDATE enrollments SET grade = 87 WHERE student_id = 5 AND course_id = 1;
COMMIT;

-- 8b. Транзакция с ROLLBACK: студента 5 записали на курс 3 и выставили оценку,
--     но затем передумали — изменения отменяются, в таблице ничего не меняется
BEGIN;
INSERT INTO enrollments (student_id, course_id) VALUES (5, 3);
UPDATE enrollments SET grade = 70 WHERE student_id = 5 AND course_id = 3;
ROLLBACK;
-- (если бы внутри транзакции произошла ошибка, например grade = 150 нарушил
--  CHECK, PostgreSQL пометил бы транзакцию как прерванную и принял бы только ROLLBACK)

-- Проверка: записи (5,3) нет, запись (5,1) с оценкой 87 есть
SELECT * FROM enrollments WHERE student_id = 5 ORDER BY course_id;


-- ===== Бонус: индекс и EXPLAIN ANALYZE =====
-- На 5 строках PostgreSQL всё равно выберет Seq Scan, поэтому
-- сначала наполняем таблицу большим объёмом тестовых данных.

INSERT INTO students (full_name, email, group_name)
SELECT 'Студент ' || g, 'student' || g || '@test.kz', 'ГР-' || (g % 50)
FROM generate_series(1, 100000) AS g;
ANALYZE students;

-- До индекса: Seq Scan — просматриваются все ~100 000 строк
EXPLAIN ANALYZE
SELECT * FROM students WHERE full_name = 'Студент 77777';

CREATE INDEX idx_students_full_name ON students(full_name);
ANALYZE students;

-- После индекса: Index Scan по idx_students_full_name, время в разы меньше
EXPLAIN ANALYZE
SELECT * FROM students WHERE full_name = 'Студент 77777';

-- Уборка тестовых данных
DROP INDEX idx_students_full_name;
DELETE FROM students WHERE email LIKE '%@test.kz';

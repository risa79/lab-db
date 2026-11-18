-- Тестовые данные. Запускать после schema.sql.

INSERT INTO teachers (full_name, email) VALUES
    ('Иванов Пётр Сергеевич',      'ivanov@center.kz'),
    ('Смирнова Анна Викторовна',   'smirnova@center.kz'),
    ('Ахметов Ержан Болатович',    'akhmetov@center.kz'),
    ('Ким Ольга Дмитриевна',       'kim@center.kz');

INSERT INTO courses (title, description, hours, teacher_id) VALUES
    ('Основы SQL',              'SELECT, JOIN, GROUP BY, подзапросы',      36, 1),
    ('PostgreSQL для разработчиков', 'Индексы, транзакции, EXPLAIN',      48, 1),
    ('Node.js и Express',       'REST API на JavaScript',                 40, 2),
    ('Проектирование БД',       'ER-модели и нормальные формы',           24, 3),
    ('Python для анализа данных','pandas и визуализация',                  60, 4);

INSERT INTO students (full_name, email, group_name) VALUES
    ('Сейткали Айгерим',  'aigerim@mail.kz',  'ИС-21'),
    ('Петров Дмитрий',    'dpetrov@mail.kz',  'ИС-21'),
    ('Нурланов Арман',    'arman@mail.kz',    'ПО-22'),
    ('Ли Виктория',       'vika.li@mail.kz',  'ПО-22'),
    ('Жумабаев Санжар',   'sanzhar@mail.kz',  'ИС-23');

-- Курс 5 («Python для анализа данных») намеренно без записей — для LEFT JOIN
INSERT INTO enrollments (student_id, course_id, enrolled_at, grade) VALUES
    (1, 1, '2026-09-01', 92),
    (1, 3, '2026-09-03', 85),
    (2, 1, '2026-09-01', 64),
    (2, 2, '2026-09-05', 71),
    (3, 1, '2026-09-02', 78),
    (3, 4, '2026-09-10', NULL),   -- оценка ещё не выставлена
    (4, 3, '2026-09-03', 58),
    (4, 4, '2026-09-10', 88),
    (5, 2, '2026-09-05', 95);

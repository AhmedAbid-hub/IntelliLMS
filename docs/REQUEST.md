# MASTER CODEX PROMPT — INTELLIGENT MULTI-INSTITUTE LEARNING MANAGEMENT SYSTEM

## 1. YOUR ROLE AND PRIMARY OBJECTIVE

You are a senior full-stack software architect, Django backend engineer, React/TypeScript frontend engineer, PostgreSQL database architect, machine learning engineer, security engineer, UI/UX designer, and QA automation engineer.

Your task is to **DESIGN, IMPLEMENT, TEST, AND DOCUMENT AN ENTIRE WORKING SOFTWARE PROJECT** named:

**IntelliLMS — AI-Powered Multi-Institute Learning Management System**

This is a Computer Science Final Year Project intended to demonstrate professional software engineering practices, modern web technologies, multi-tenant architecture, role-based access control, and practical machine learning integration.

You must build the actual application, not merely describe how to build it.

The project must support schools, colleges, universities, and other educational institutes through a configurable academic structure.

The system must allow multiple independent educational institutes to operate within one platform while maintaining strict isolation of users, departments, student information, courses, records, and academic activities.

The application must include five primary roles:

1. Super Admin
2. Institute Admin
3. Department Head
4. Teacher / Instructor
5. Student

The additional intelligent component must analyze student engagement and academic performance and provide appropriately validated or clearly labeled experimental predictions.

### Core expectations

- Generate real source code and configuration files.
- Build both backend and frontend.
- Build a functional relational database.
- Implement real authentication and permissions.
- Implement working CRUD operations.
- Implement complete student and teacher workflows.
- Build the machine learning training and inference components.
- Connect all components together.
- Provide realistic demo data.
- Write automated tests.
- Document installation and usage.
- Make the entire application runnable locally.
- Provide a reproducible deployment configuration.
- Fix implementation errors discovered during testing.

Do not stop at architecture diagrams, database schemas, project scaffolding, empty React components, or placeholder endpoints.

If the task exceeds your execution context, complete as much actual implementation as possible, save your progress, and continue on subsequent execution. Never report an unfinished feature as complete.

---

# 2. REQUIRED TECHNOLOGY STACK

Use this stack unless a genuine compatibility problem requires a documented substitution.

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- React Hook Form
- Zod
- Lucide React icons

Use modern, compatible stable package versions.

Build a responsive single-page application with professional dashboards and reusable components.

## Backend

- Python 3.12 or a compatible newer stable Python version
- Django 5.2 LTS
- Django REST Framework
- Django ORM
- Django permissions and authentication
- Secure Django session authentication
- CSRF protection
- PostgreSQL driver
- Django management commands

Use Django REST Framework to create a versioned API.

## Database

PostgreSQL.

Use proper relational modeling, foreign keys, unique constraints, indexes, migrations, transactions, and referential integrity.

## Machine Learning

- Python
- Pandas
- NumPy
- Scikit-learn
- Matplotlib for evaluation and analytical charts
- Joblib for loading trusted, locally generated model artifacts

Do not introduce TensorFlow or PyTorch unless there is a demonstrated technical need.

## Development and deployment

- Git
- Docker
- Docker Compose
- Environment variables
- Python virtual environments
- npm
- pytest / pytest-django
- React Testing Library
- Vitest
- Playwright for critical end-to-end workflows, if feasible

Use a monorepo and a modular monolith architecture.

Do not unnecessarily introduce microservices, Kubernetes, Redis, Celery, Next.js, MongoDB, or additional backend frameworks.

---

# 3. PROJECT STRUCTURE

Create a maintainable structure similar to:

```text
intellilms/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── layouts/
│   │   │   ├── forms/
│   │   │   └── shared/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── institutes/
│   │   │   ├── departments/
│   │   │   ├── users/
│   │   │   ├── courses/
│   │   │   ├── assignments/
│   │   │   ├── quizzes/
│   │   │   ├── attendance/
│   │   │   ├── grades/
│   │   │   ├── analytics/
│   │   │   ├── predictions/
│   │   │   └── notifications/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types/
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── config/
│   ├── apps/
│   │   ├── accounts/
│   │   ├── institutes/
│   │   ├── academics/
│   │   ├── courses/
│   │   ├── assessments/
│   │   ├── attendance/
│   │   ├── notifications/
│   │   ├── analytics/
│   │   ├── predictions/
│   │   └── audit/
│   ├── ml/
│   │   ├── data/
│   │   ├── training/
│   │   ├── inference/
│   │   └── evaluation/
│   ├── tests/
│   ├── manage.py
│   └── requirements.txt
├── deployment/
├── docs/
├── scripts/
├── docker-compose.yml
├── .env.example
├── README.md
├── AGENTS.md
└── IMPLEMENTATION_PROGRESS.md
```

You may improve this structure where necessary.

Keep the project organized by features and business domains.

Avoid giant views, oversized React components, circular imports, and duplicated business logic.

---

# 4. MULTI-INSTITUTE ARCHITECTURE

This is one of the most important requirements.

The software must support multiple organizations within one application.

Example:

- Institute A: University
- Institute B: College
- Institute C: School

Each organization must have its own:

- Administrative users
- Academic departments or units
- Teachers
- Students
- Courses
- Academic years
- Terms or semesters
- Sections
- Assignments
- Examinations
- Attendance
- Grades
- Reports
- Machine learning prediction records

## Multi-tenancy implementation

Use a shared PostgreSQL database with explicit tenant/institute ownership.

Each institute-owned record must have an unambiguous ownership relationship.

Ensure institute scope is applied to:

- Database querysets
- REST API permissions
- Object retrieval
- Search
- Filtering
- Reports
- File downloads
- Analytics
- Machine learning inference
- Bulk operations

A user from Institute A must never read, create, modify, or delete Institute B's private records unless explicitly authorized as the platform Super Admin.

Do not rely on frontend route visibility for security.

Validate related objects belong to the same institute before saving.

Use UUID identifiers where beneficial.

Include automated tests attempting cross-institute access.

## Institute categories

Support:

- School
- College
- University
- Other educational institute

Do not hardcode a single academic organization model.

Use flexible academic units, hierarchy, programs, class sections, academic terms, and course offerings.

Examples:

School:
Grade 9 → Section A → Mathematics

College:
Intermediate Program → Year 1 → Physics

University:
Faculty of Computing → Computer Science Department → BSCS → Semester 5 → Artificial Intelligence

Allow academic units to be optional where appropriate.

---

# 5. AUTHENTICATION AND ROLE-BASED ACCESS CONTROL

Implement secure authentication and authorization.

Use Django sessions with HTTP-only cookies and CSRF protection.

In development, configure Vite's proxy so the frontend and backend can interact through a consistent local origin.

In production, serve the frontend and API under the same site through a reverse proxy.

Implement:

- Login
- Logout
- Current user endpoint
- Password change
- Password reset using configurable email backend
- Password strength validation
- Disabled user accounts
- Institute membership selection
- Permission-aware navigation
- Protected React routes
- Backend object-level authorization
- Secure session lifecycle

Do not store authentication secrets in localStorage.

Avoid unnecessary custom cryptography.

## User model

Create a custom Django User model before initial migrations.

Users may belong to multiple institutes with different roles.

Example:

A person can be a Teacher in Institute A and a Student in Institute B.

Use an InstituteMembership model to associate:

- User
- Institute
- Role
- Membership status
- Associated department when applicable

## Role 1: Super Admin

The Super Admin controls the platform.

Functionalities:

- Global dashboard
- Create educational institutes
- Edit institute information
- Activate or deactivate institutes
- View platform-level statistics
- View institute counts
- View user counts
- Assign institute administrators
- Manage platform configuration
- Review audit logs
- Access authorized institute administration functions

Protect Super Admin creation.

Never expose public Super Admin registration.

## Role 2: Institute Admin

Manage an assigned institute.

Functionalities:

- Institute dashboard
- Update institute profile
- Manage departments and academic units
- Manage academic years and terms
- Manage programs, classes, sections
- Create and manage teachers
- Create and manage students
- Assign Department Heads
- Create subjects and course offerings
- Assign teachers to course offerings
- Enroll students
- Manage academic calendars
- View institute-level reports
- Review attendance summaries
- Review academic performance
- Review authorized ML analytics
- Publish institute-wide announcements

Cannot access other institutes.

## Role 3: Department Head

Manage authorized departments or academic units.

Functionalities:

- Department dashboard
- View departmental teachers
- View departmental students
- View departmental courses
- Assign authorized teaching responsibilities
- Monitor academic performance
- View departmental attendance summaries
- Monitor at-risk students
- View instructor workload
- Generate departmental reports
- Publish department-specific announcements

Cannot access unrelated departments or institutes.

## Role 4: Teacher / Instructor

Manage assigned course offerings.

Functionalities:

- Teacher dashboard
- View assigned courses
- Create learning modules
- Add lessons
- Upload learning materials
- Create assignments
- Create quizzes
- Manage question banks
- Record attendance
- Review assignment submissions
- Grade assessments
- Provide feedback
- View course enrollment lists
- View student progress
- Review authorized academic risk predictions
- View class-level engagement analytics
- Publish course announcements

Teachers must not access grades or student records from courses they are not authorized to teach.

## Role 5: Student

Functionalities:

- Student dashboard
- View enrolled courses
- View course learning materials
- Complete lessons
- Download authorized resources
- Submit assignments
- Attempt quizzes
- View released assessment results
- View attendance history
- View grades and feedback
- View course announcements
- View academic progress
- View personal learning activity
- View personal performance trends
- Update permitted profile fields

Students cannot modify grades, attendance, published scores, or another student's academic data.

---

# 6. COMPLETE FUNCTIONAL MODULES

Implement the following modules.

## Module A: Platform Administration

Develop:

- Super Admin dashboard
- Institute registration by Super Admin
- Institute management
- Institute activation/deactivation
- Administrator assignment
- Platform statistics
- Audit history

## Module B: Academic Structure Management

Develop CRUD interfaces and APIs for:

- Academic years
- Terms/semesters
- Faculties or academic units
- Departments
- Programs
- Grades
- Classes
- Sections
- Subjects
- Course offerings
- Teaching assignments
- Student enrollments

Support configurable terminology.

Implement appropriate validation and duplicate prevention.

## Module C: User Management

Features:

- Create users
- Edit profile
- Activate/deactivate accounts
- Assign institute membership
- Assign roles
- Assign departments
- Search users
- Filter by role/status/department
- Pagination
- CSV student import
- CSV teacher import
- Import validation with downloadable error details
- Prevent duplicate membership records

Use safe account invitation or temporary-password workflows.

Do not send plaintext permanent passwords by email.

## Module D: Course Management

Features:

- Create courses
- Assign instructors
- Enroll students
- Create course sections
- Create course learning modules
- Create lessons
- Reorder content
- Upload materials
- Publish/unpublish lessons
- Set visibility dates
- Track lesson completion
- View enrolled students
- Archive completed offerings

A Course represents a reusable subject definition.

A CourseOffering represents a particular class or term instance.

Keep these concepts separate.

## Module E: Learning Materials

Support:

- Text lessons
- PDF resources
- Documents
- Images
- External video links
- Downloadable files
- Lesson descriptions
- Lesson completion tracking

Use secure file handling.

Validate file extensions, MIME types where practical, and upload size.

Protect private file downloads with authorization checks.

Do not expose private student submissions through publicly accessible static URLs.

## Module F: Assignment Management

Teachers can:

- Create assignments
- Set title and description
- Set maximum marks
- Set submission deadlines
- Attach supporting resources
- Set late-submission policies
- View submissions
- Grade submissions
- Add feedback
- Release grades

Students can:

- View assignments
- Submit text answers
- Upload assignment files
- View submission timestamps
- View submission status
- View feedback after release

Implement:

- Draft
- Published
- Submitted
- Late
- Graded
- Returned/released

Apply deadlines consistently using server-side time validation.

Prevent unauthorized resubmissions unless the assignment configuration permits them.

## Module G: Quiz and Examination Management

Teachers can:

- Create quizzes
- Add questions
- Edit questions
- Configure marks
- Set time limits
- Set attempt limits
- Configure availability windows
- Publish/unpublish quizzes
- Review results

Supported question types:

- Multiple choice
- True/false
- Short answer

Automatically grade MCQ and true/false questions.

Allow manual grading for short answers.

Students can:

- View available quizzes
- Start an attempt
- Save answers
- Submit attempts
- View results when released

Enforce timing and attempt restrictions on the backend.

Do not send correct answers to the student before the results are permitted to be disclosed.

Calculate scores accurately.

## Module H: Attendance Management

Features:

- Create course attendance sessions
- Select date and relevant class
- Mark students present
- Mark absent
- Mark late
- Mark excused
- Bulk attendance marking
- Update attendance with authorization
- Student attendance history
- Course attendance percentages
- Department attendance reports
- Institute attendance reports

Prevent unauthorized duplicate attendance entries.

Record changes in an audit trail.

## Module I: Grades and Academic Results

Features:

- Assignment grading
- Quiz grading
- Manual assessment entries where authorized
- Configurable grading weights
- Weighted course score calculations
- Grade release controls
- Student gradebook
- Course gradebook
- Academic performance summaries
- Grade history
- CSV export

Support institute-specific grading rules.

Never expose unreleased or other students' results.

## Module J: Academic Timetable

Create a manageable scheduling module:

- Timetable events
- Course meeting schedules
- Assigned teachers
- Classroom/location text
- Meeting start/end time
- Day of week
- Student personal timetable
- Teacher timetable

Check for obvious schedule conflicts when sufficient information exists.

## Module K: Announcements and Notifications

Create announcements scoped to:

- Entire institute
- Department
- Course offering

Support:

- Announcement creation
- Announcement editing
- Publishing
- Audience filtering
- Notification list
- Read/unread status

Generate notifications for events such as:

- New assignment
- New announcement
- Released grade
- Upcoming assignment deadline

For the initial implementation, use database-backed notifications rather than requiring external messaging services.

## Module L: Reporting and Analytics

Create dashboards for each role.

Provide:

- Student count
- Teacher count
- Active courses
- Enrollment statistics
- Attendance statistics
- Assignment completion rates
- Quiz performance
- Course performance
- Department performance
- Student progress
- Activity trends
- Academic risk summaries

Use SQL aggregation and backend analytics services where appropriate.

Use accessible tables, summary cards, progress bars, and Python-generated analytical charts where useful.

Avoid claiming an analytic measurement when the underlying activity was not recorded.

---

# 7. MACHINE LEARNING AND STUDENT PERFORMANCE PREDICTION

This is a major differentiating feature and must be implemented carefully.

Create a working ML experimentation, training, evaluation, and inference pipeline.

## Main objective

Estimate the probability that a student may fail a course or experience poor academic outcomes using information available before the outcome occurs.

Secondary objective:

Analyze patterns of student engagement and academic activity.

The model must not make high-stakes academic decisions automatically.

## Possible features

Use features actually collected by the LMS, for example:

- Attendance percentage
- Number of submitted assignments
- Number of missing assignments
- Assignment scores available to date
- Quiz scores available to date
- Lesson completion percentage
- Course engagement frequency
- Time since last LMS activity
- Number of completed learning modules
- Assignment submission punctuality
- Recent score trends

Avoid protected personal characteristics and unnecessary personal data.

Do not invent unavailable user activity.

Do not use final course results as input when predicting those same results.

## Target variables

Implement a clear initial target:

`risk_of_course_failure`

The output can include:

- Predicted probability
- Risk category
- Model version
- Prediction timestamp
- Features used
- Data sufficiency status
- Explanation of influential factors

Risk categories can be configured, for example:

- Low
- Moderate
- High

These labels must be based on documented thresholds and must not imply certainty.

## Algorithms

Implement and compare at least:

1. Logistic Regression
2. Random Forest Classifier
3. HistGradientBoostingClassifier or another suitable gradient boosting baseline

Use Scikit-learn Pipelines for preprocessing.

Handle:

- Missing values
- Feature scaling where required
- Appropriate categorical encoding
- Class imbalance where applicable
- Training/test splitting
- Model selection
- Reproducibility

Prevent data leakage.

Where appropriate, split by student or chronological period to avoid overly optimistic estimates caused by repeated records.

## Evaluation metrics

Calculate:

- Accuracy
- Precision
- Recall
- F1-score
- ROC-AUC when applicable
- Confusion matrix
- Calibration measures where practical

Compare models using an explicit evaluation strategy.

Do not use training accuracy as proof of generalization.

## Dataset strategy

The project must be runnable even without access to real student records.

Implement two separate modes:

### Mode 1 — Demo/Experimental Mode

Create an explicitly synthetic, non-personal demonstration dataset.

Provide a reproducible data generation script.

Use this dataset to demonstrate:

- Preprocessing
- Training
- Evaluation
- Model persistence
- Inference
- Frontend integration

Clearly label every prediction and reported metric from synthetic data as:

"DEMO — SYNTHETIC DATA — NOT VALIDATED FOR REAL STUDENT USE"

Do not present synthetic-data metrics as evidence of real-world predictive accuracy.

### Mode 2 — Historical Data Mode

Allow authorized administrators to train a model when sufficient real, lawful, properly labeled historical records become available.

Ensure training includes:

- Outcome labels
- Data validation
- Minimum sample requirements
- Feature availability checks
- Version tracking
- Train/test separation
- Evaluation records

If there is insufficient data, return an informative status rather than inventing predictions.

Create documentation for adapting external public datasets such as OULAD.

Do not automatically download datasets with unclear usage rights.

Do not assume an external dataset perfectly matches the internal schema.

## Prediction service

Implement Django services for:

- Loading a trusted trained model
- Computing input features
- Validating input sufficiency
- Running inference
- Persisting prediction metadata
- Returning predictions through DRF
- Displaying model status

Use a locally trusted model artifact.

Do not load arbitrary user-uploaded pickle or Joblib files.

## Teacher prediction dashboard

Build:

- At-risk student summary
- Risk distribution
- Per-student predictions
- Attendance/assessment context
- Prediction details
- Last generated timestamp
- Model version
- Demo or validation warning

Only authorized teachers and academic administrators may view predictions for students within their permitted academic scope.

## Student analytics dashboard

Provide supportive personal insights:

- Attendance trends
- Assessment performance
- Assignment completion
- Learning progress
- Engagement patterns

Avoid harmful labels or unsupported claims about permanent learning ability.

## Model transparency

Document:

- Prediction target
- Input features
- Data sources
- Training methodology
- Evaluation methodology
- Limitations
- Model bias considerations
- Why prediction quality may vary by institution

---

# 8. DATABASE DESIGN

Design normalized models with suitable constraints and indexes.

At minimum, consider the following entities.

## Identity and organization

- User
- Institute
- InstituteMembership
- Role
- AcademicUnit
- Department
- Program
- AcademicYear
- AcademicTerm
- ClassSection

## Courses

- Subject
- Course
- CourseOffering
- TeachingAssignment
- Enrollment
- LearningModule
- Lesson
- LearningMaterial
- LessonCompletion

## Assessments

- Assignment
- AssignmentSubmission
- AssignmentFeedback
- Quiz
- Question
- AnswerOption
- QuizAttempt
- StudentAnswer
- AssessmentGrade
- GradingScheme
- GradeRelease

## Attendance

- AttendanceSession
- AttendanceRecord

## Scheduling

- TimetableEvent

## Analytics

- LearningActivity
- StudentAcademicSummary
- ModelVersion
- ModelEvaluation
- StudentPrediction

## Communication and monitoring

- Announcement
- Notification
- AuditLog

You may combine or rename models if that provides a cleaner normalized design.

For every model:

- Define explicit relationships.
- Specify field types.
- Add database constraints.
- Add appropriate indexes.
- Add creation/update timestamps where necessary.
- Handle status transitions.
- Validate institute scope.
- Use descriptive related names.
- Prevent logically invalid records.

Create proper Django migrations.

Avoid using JSON fields for data that should be represented as relational tables.

---

# 9. BACKEND API REQUIREMENTS

All main functionality must be accessible through Django REST Framework.

Use `/api/v1/` as the base prefix.

Example endpoints:

```text
/api/v1/auth/
/api/v1/auth/login/
/api/v1/auth/logout/
/api/v1/auth/me/
/api/v1/auth/csrf/
/api/v1/institutes/
/api/v1/memberships/
/api/v1/departments/
/api/v1/academic-years/
/api/v1/terms/
/api/v1/programs/
/api/v1/classes/
/api/v1/courses/
/api/v1/course-offerings/
/api/v1/enrollments/
/api/v1/modules/
/api/v1/lessons/
/api/v1/assignments/
/api/v1/submissions/
/api/v1/quizzes/
/api/v1/quiz-attempts/
/api/v1/attendance/
/api/v1/grades/
/api/v1/timetable/
/api/v1/announcements/
/api/v1/notifications/
/api/v1/analytics/
/api/v1/predictions/
/api/v1/model-status/
/api/v1/reports/
```

Adapt exact URLs to a consistent REST resource design.

Requirements:

- Appropriate HTTP methods
- Correct status codes
- Serializer validation
- Object-level permissions
- Scoped querysets
- Pagination
- Search
- Filtering
- Ordering
- Consistent error responses
- Clear request/response schemas
- Atomic transactions when necessary

Expose API documentation using a compatible OpenAPI solution.

Avoid duplicated permission code.

Use a central strategy for institute membership and scope enforcement.

---

# 10. FRONTEND UI/UX REQUIREMENTS

Design a clean, modern educational SaaS interface.

The application should resemble a professional university management and learning platform, not a basic tutorial dashboard.

## Design system

Use:

- Clean typography
- Consistent spacing
- Modern cards
- Responsive tables
- Sidebar navigation
- Top navigation
- Breadcrumbs
- Tabs
- Search boxes
- Filters
- Form validation
- Confirmation dialogs
- Toast notifications
- Empty states
- Loading skeletons
- Error states
- Accessible input labels
- Keyboard-accessible interactions

Create a unified visual identity for IntelliLMS.

Use a tasteful, professional palette with optional light and dark themes.

Avoid unnecessary animation.

## Required pages

### Public/authentication

- Login page
- Password reset pages
- Unauthorized page
- Not-found page

### Super Admin

- Global overview
- Institute list
- Create/edit institute
- Institute detail
- Administrators
- Platform analytics
- Audit logs

### Institute Admin

- Dashboard
- Institute settings
- Academic structure
- Department management
- Teacher management
- Student management
- Academic years/terms
- Program and class management
- Course offerings
- Enrollments
- Institute announcements
- Attendance reports
- Academic reports
- ML analytics

### Department Head

- Dashboard
- Department teachers
- Department students
- Course offerings
- Performance analytics
- Attendance analytics
- At-risk students

### Teacher

- Dashboard
- My courses
- Course detail
- Course content editor
- Assignment management
- Submission grading
- Quiz builder
- Quiz results
- Attendance entry
- Gradebook
- Student progress
- ML risk dashboard
- Announcements
- Timetable

### Student

- Dashboard
- My courses
- Lesson viewer
- Assignments
- Assignment submissions
- Available quizzes
- Quiz attempt interface
- Grades
- Attendance
- Academic progress
- Learning analytics
- Timetable
- Notifications
- Profile

## Routing

Use role-aware layouts.

Avoid displaying unauthorized navigation actions.

However, rely on backend authorization as the actual security boundary.

## React implementation

Use:

- Typed API client
- Central authentication context or equivalent
- TanStack Query for server state
- React Hook Form and Zod for forms
- Reusable form components
- Feature-specific API hooks
- Proper query invalidation after mutations
- Consistent error handling

Do not hardcode dashboard statistics.

All statistics must come from real backend queries or clearly labeled demo records.

---

# 11. SECURITY AND PRIVACY

Security is mandatory.

Implement:

- Secure password hashing through Django
- Session security
- CSRF protection
- Appropriate cookie settings
- Tenant data isolation
- Role-based permissions
- Object-level authorization
- Input validation
- File upload validation
- Query parameter validation
- Protection against IDOR
- Protection against mass assignment
- Safe error messages
- Secure configuration of CORS if used
- Environment-based secrets
- Development/production configuration separation
- Login rate limiting where practical
- Audit logging for sensitive academic changes

Do not expose:

- Private student records
- Password hashes
- Sensitive configuration
- Unauthorized student files
- Unreleased grades
- Other institutes' data
- Model training data through public endpoints

Use Django ORM rather than unsafe SQL interpolation.

Keep uploaded files outside public static assets and serve them through permission-checked endpoints or an equivalent secure mechanism.

Do not log passwords, session tokens, or private student information.

Include a data deletion/retention approach in the documentation.

---

# 12. DATA SEEDING AND DEMONSTRATION

Create a repeatable demo data generation command.

Generate at least:

- One Super Admin
- One sample university
- One sample school
- One sample college
- Institute Admin users
- Department Head users
- Teachers
- Students
- Academic years and terms
- Departments or academic units
- Programs/classes
- Courses
- Course offerings
- Enrollments
- Lessons
- Assignments
- Quiz questions
- Quiz attempts
- Attendance entries
- Grades
- Announcements
- Learning activities

Use fictional data only.

The dataset must demonstrate different institute structures.

Create enough records to populate dashboards and support filtering, pagination and realistic navigation.

Use repeatable random seeds where appropriate.

Demo accounts must only be enabled through an explicit local development setup command.

Document all demo credentials.

Never deploy default demonstration passwords to production.

---

# 13. TESTING REQUIREMENTS

Write automated tests while implementing features.

## Backend tests

Test:

- Authentication
- Institute membership selection
- Permission enforcement
- Cross-institute data isolation
- Department restrictions
- Teacher course ownership
- Student enrollment access
- Enrollment validation
- Assignment creation/submission
- Quiz grading
- Quiz attempt limitations
- Grade release restrictions
- Attendance calculations
- Academic score calculations
- File download authorization
- Analytics permissions
- ML prediction permissions
- Model data sufficiency behavior

Include negative security tests.

For example:

A teacher from Institute A requesting a student record belonging to Institute B must receive an appropriate denial.

## Frontend tests

Test:

- Login forms
- Protected routes
- Role-specific navigation
- Form validation
- Course enrollment UI
- Assignment submission UI
- Quiz flow
- Attendance interface
- Analytics loading/error states

## End-to-end tests

Where practical, use Playwright to test:

1. Institute Admin creates an academic structure.
2. Admin assigns a teacher.
3. Admin enrolls a student.
4. Teacher publishes course content.
5. Student opens a lesson.
6. Teacher creates an assignment.
7. Student submits the assignment.
8. Teacher grades it.
9. Student views released feedback.
10. Teacher reviews student analytics.

Tests must run using isolated test data.

---

# 14. ENVIRONMENT AND LOCAL DEVELOPMENT

Provide a fully documented local setup.

Create `.env.example` with all required configuration.

Never commit real secrets.

Use PostgreSQL through Docker Compose if it simplifies setup.

Support a workflow similar to:

```bash
docker compose up -d db

cd backend
python -m venv .venv
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

And:

```bash
cd frontend
npm install
npm run dev
```

Adjust instructions for Windows PowerShell and Linux/macOS.

Create clear scripts where useful.

Ensure the commands reflect actual files and work.

Do not document imaginary commands.

---

# 15. DOCKER AND DEPLOYMENT

Create a practical deployment setup.

Requirements:

- Dockerfile for Django
- Production frontend build
- PostgreSQL service
- Persistent database volume
- Secure backend configuration
- Static asset handling
- Media storage strategy
- Reverse proxy configuration
- Health checks
- Environment variable support
- Migration procedure
- Database backup guidance

Create a development configuration and a separate production example.

Never set DEBUG=True in the production example.

Document HTTPS requirements.

Production deployment should not depend on the Vite development server.

Do not require a paid cloud service.

---

# 16. DOCUMENTATION

Create detailed documentation in `/docs`.

Required:

1. Project overview
2. Software requirements specification
3. Functional requirements
4. Non-functional requirements
5. System architecture
6. Database ERD
7. Role and permission matrix
8. API documentation
9. Setup guide
10. Developer guide
11. User guides for all five roles
12. Testing guide
13. Machine learning methodology
14. Model evaluation report
15. Security and privacy design
16. Deployment instructions
17. Known limitations
18. Future enhancements

Provide Mermaid diagrams where appropriate.

Include an ERD showing important relationships.

Document real implemented behavior, not intended future behavior.

---

# 17. IMPLEMENTATION WORKFLOW

Follow this execution workflow.

## Step 1 — Inspect the repository

Check whether files already exist.

Read existing instructions and configuration.

Preserve useful working code.

Avoid deleting unrelated files without a compelling reason.

If the repository is empty, initialize it.

## Step 2 — Create project guidance

Create `AGENTS.md` describing:

- Project architecture
- Technology stack
- Coding conventions
- Testing requirements
- Tenant isolation principles
- Frontend/backend boundaries
- How to run the project
- Rules for future changes

Create `IMPLEMENTATION_PROGRESS.md` containing a task checklist.

Update that checklist after completing each implementation milestone.

## Step 3 — Build the backend foundation

Implement:

- Django initialization
- Database configuration
- Custom User model
- Institute model
- Membership and roles
- Authentication
- Permissions
- Institute-scoped access utilities
- Migrations
- Foundational tests

Verify the foundation before expanding.

## Step 4 — Build the frontend foundation

Implement:

- Vite initialization
- TypeScript setup
- Tailwind configuration
- shadcn/ui setup
- Routing
- Authentication integration
- Layout components
- Sidebar
- Login/logout flow
- Role-aware dashboard shell
- API client

Connect the frontend to the backend.

## Step 5 — Implement academic administration

Build all core academic structure models, APIs, pages, forms, permissions and tests.

## Step 6 — Implement learning workflows

Build:

- Courses
- Enrollment
- Learning materials
- Assignments
- Quizzes
- Attendance
- Gradebook
- Scheduling
- Notifications

Complete backend, frontend and tests for each feature.

## Step 7 — Implement analytics and machine learning

Build:

- Activity tracking
- Academic analytics
- Model training scripts
- Model evaluation
- Versioned model persistence
- Prediction services
- Prediction APIs
- Teacher risk dashboard
- Student progress dashboard
- Documentation of experimental limitations

## Step 8 — Integrate and test

Run database migrations.

Run backend tests.

Run frontend tests.

Run linting/type checks.

Build the frontend.

Start the application.

Test complete user workflows.

Fix errors.

## Step 9 — Create deployment configuration

Build Docker images and verify configuration to the extent your environment allows.

## Step 10 — Final audit

Review the requirement list.

Mark every item as:

- Complete and tested
- Implemented but not fully tested
- Partially implemented
- Not implemented

Do not falsely mark features complete.

---

# 18. STRICT DEVELOPMENT RULES

Follow these rules throughout implementation.

1. Write actual files in the repository.
2. Do not produce only explanations or code samples.
3. Do not create fake API endpoints returning hardcoded data.
4. Do not create nonfunctional buttons.
5. Do not silently use mock data in real production workflows.
6. Use database-backed functionality.
7. Implement backend authorization for every protected resource.
8. Use typed interfaces in React.
9. Keep the application modular.
10. Reuse components.
11. Avoid unnecessary dependencies.
12. Follow Django and React best practices.
13. Validate all forms and important backend fields.
14. Use real database migrations.
15. Keep the application runnable after each major phase.
16. Update documentation when behavior changes.
17. Write tests for important business logic.
18. Resolve compilation and migration errors.
19. Do not claim that synthetic ML results prove predictive validity.
20. Preserve progress across execution sessions.

If a dependency is unavailable, document the blocker and complete other independent work.

If a command fails, investigate the error and attempt a proper fix rather than skipping verification.

Do not silently remove requested features to avoid development complexity.

Do not repeatedly request confirmation for ordinary implementation decisions. Choose reasonable defaults and document them.

---

# 19. DEFINITION OF DONE

Consider the FYP operationally complete only when all of the following are true:

### Platform

- Super Admin can log in.
- Super Admin can create an institute.
- Institute Admin can manage the institute.
- Different institutes are isolated.

### Academics

- Admin can create academic years, terms and departments.
- Admin can create teachers and students.
- Admin can create course offerings.
- Admin can enroll students.

### Learning

- Teachers can manage course content.
- Students can view authorized content.
- Teachers can create assignments.
- Students can submit assignments.
- Teachers can grade submissions.
- Students can view released grades.

### Assessments

- Teachers can create quizzes.
- Students can attempt quizzes.
- Auto-graded questions work correctly.
- Manual grading is supported.

### Attendance

- Teachers can record attendance.
- Students can view their attendance.
- Attendance summaries calculate correctly.

### Analytics

- Dashboards display database-derived information.
- Students can view their own learning progress.
- Teachers can view course performance analytics.
- Department Heads can view authorized departmental reports.

### Machine learning

- Training script is executable.
- Model evaluation produces reproducible output.
- Trained model can be loaded for inference.
- API can return a prediction when valid inputs and a usable model exist.
- Predictions include model metadata.
- Insufficient-data behavior works.
- Synthetic/demo predictions are clearly labeled.
- The teacher dashboard displays the correct prediction status and information.

### Quality

- React application builds.
- Django system checks pass.
- Migrations execute.
- Automated tests pass.
- Demo seed command works.
- Project documentation matches the actual application.
- Critical workflows can be demonstrated end-to-end.

---

# 20. FINAL DELIVERABLES

The repository must contain:

- Complete Django backend
- Complete React frontend
- PostgreSQL database migrations
- Authentication and role-based authorization
- Multi-institute isolation
- Academic management modules
- Teacher LMS modules
- Student LMS modules
- Assignment and quiz workflows
- Attendance and grade management
- Reporting and analytics
- ML training and inference components
- Seed data
- Automated tests
- Docker configuration
- Environment template
- Setup documentation
- Architecture documentation
- User guides
- Testing documentation
- ML evaluation documentation

At the end, provide:

1. Implementation summary
2. Exact startup commands
3. Local URLs
4. Demonstration accounts
5. Test results
6. Features completed
7. Incomplete features or blockers
8. Next actions, if necessary

Only claim successful execution for commands you actually ran.

---

# 21. IMPORTANT PROJECT PRIORITIES

This is a university Final Year Project.

Prioritize:

1. Correctness
2. Multi-institute security
3. Working academic workflows
4. Working API/frontend integration
5. Maintainable code
6. Functional machine learning demonstration
7. Professional user interface
8. Automated testing
9. Documentation
10. Reproducible deployment

Do not sacrifice security or working functionality for visual effects.

Do not make the entire project depend on the ML component. The normal LMS must work independently.

The intelligent features should enhance the LMS, not prevent it from functioning if no trained ML model is available.

An experimental model must never be represented as a clinically, educationally, or statistically validated decision-making system without supporting evaluation.

---

# 22. START EXECUTION NOW

Begin implementing the software project in the current repository.

Do not stop after writing a plan.

First inspect the repository and create the project guidance and progress checklist.

Then initialize the backend and frontend.

Continue implementing features in dependency order.

For each major feature:

1. Implement database models.
2. Implement migrations.
3. Implement serializers and validation.
4. Implement API views and permissions.
5. Implement tests.
6. Implement React pages and components.
7. Connect the frontend to actual APIs.
8. Verify functionality.
9. Update implementation progress.

Keep performing implementation work until the available execution session ends or the defined scope is completed.

If the execution session ends before completion, leave the repository in a consistent state and document exactly what the next Codex session should implement.

**YOUR GOAL IS TO DELIVER A FUNCTIONAL, TESTED, MODERN, MULTI-INSTITUTE INTELLIGENT LEARNING MANAGEMENT SYSTEM, NOT JUST A PROTOTYPE SCREEN OR DEVELOPMENT PLAN.**

**START CODING NOW.**
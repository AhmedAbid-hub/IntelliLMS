# Database dictionary

Generated from the current Django model registry, including inherited fields, automatic join tables and Django framework tables. Types below use the PostgreSQL backend. No student records or credentials are included.

Regenerate: `python scripts/generate_developer_reference.py --write`. Check the live target's table/column agreement with `--verify-postgres --check`; that mode uses a read-only transaction. Index names created automatically by PostgreSQL may differ; inspect them in DBeaver. No cosmetic schema changes are required.

Read [relationships](DATABASE_RELATIONSHIPS.md), [feature workflows](FEATURE_WORKFLOWS.md), [role rules](ROLES_AND_PERMISSIONS.md) and the [visual explorer guide](DATABASE_EXPLORER_GUIDE.md). Public API names do not necessarily equal physical table names. The `on_delete` labels describe Django ORM deletion policies, not PostgreSQL ON DELETE clauses.

## academics_admissionbatch

**Model:** `academics.AdmissionBatch` · **Source:** [backend/apps/academics/models.py](../backend/apps/academics/models.py)

Entry cohort for a program/year.

**Workflow / roles:** `batches/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `name` | `name` | `varchar(120)` | no | — |
| `program_id` | `program` | `uuid` | no | indexed; FK → `academics_program.id`; on_delete=PROTECT |
| `year_id` | `year` | `uuid` | no | indexed; FK → `academics_year.id`; on_delete=PROTECT |
| `active` | `active` | `boolean` | no | — |

**Additional constraints and indexes:**

- `unique_admission_batch_program`: `<UniqueConstraint: fields=('program', 'name') name='unique_admission_batch_program'>`

## academics_admissionreceipt

**Model:** `academics.AdmissionReceipt` · **Source:** [backend/apps/academics/models.py](../backend/apps/academics/models.py)

Tenant idempotency key/digest tying a submitted admission to its member.

**Workflow / roles:** `admissions/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `key` | `key` | `uuid` | no | — |
| `membership_id` | `membership` | `uuid` | no | indexed; FK → `accounts_membership.id`; on_delete=PROTECT |
| `digest` | `digest` | `varchar(64)` | no | — |

**Additional constraints and indexes:**

- `unique_admission_request`: `<UniqueConstraint: fields=('institute', 'key') name='unique_admission_request'>`

## academics_course

**Model:** `academics.Course` · **Source:** [backend/apps/academics/models.py](../backend/apps/academics/models.py)

Reusable subject/catalog definition, optional credits and unit.

**Workflow / roles:** `courses/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `credit_hours` | `credit_hours` | `numeric(5, 2)` | yes | — |
| `active` | `active` | `boolean` | no | — |
| `code` | `code` | `varchar(30)` | no | — |
| `name` | `name` | `varchar(150)` | no | — |
| `description` | `description` | `text` | no | — |
| `unit_id` | `unit` | `uuid` | yes | indexed; FK → `academics_unit.id`; on_delete=PROTECT |

**Additional constraints and indexes:**

- `unique_course_code`: `<UniqueConstraint: fields=('institute', 'code') name='unique_course_code'>`

## academics_curriculumitem

**Model:** `academics.CurriculumItem` · **Source:** [backend/apps/academics/models.py](../backend/apps/academics/models.py)

Required/elective subject mapped to a program stage.

**Workflow / roles:** `curriculum/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `program_id` | `program` | `uuid` | no | indexed; FK → `academics_program.id`; on_delete=PROTECT |
| `course_id` | `course` | `uuid` | no | indexed; FK → `academics_course.id`; on_delete=PROTECT |
| `stage` | `stage` | `smallint` | no | — |
| `required` | `required` | `boolean` | no | — |
| `active` | `active` | `boolean` | no | — |

**Additional constraints and indexes:**

- `unique_curriculum_subject_stage`: `<UniqueConstraint: fields=('program', 'course', 'stage') name='unique_curriculum_subject_stage'>`

## academics_enrollment

**Model:** `academics.Enrollment` · **Source:** [backend/apps/academics/models.py](../backend/apps/academics/models.py)

Retained student-offering membership; withdrawal flips active.

**Workflow / roles:** `enrollments/`; `offerings/{id}/bulk-enrollment/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `offering_id` | `offering` | `uuid` | no | indexed; FK → `academics_offering.id`; on_delete=CASCADE |
| `student_id` | `student` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=PROTECT |
| `active` | `active` | `boolean` | no | — |

**Additional constraints and indexes:**

- `unique_enrollment`: `<UniqueConstraint: fields=('offering', 'student') name='unique_enrollment'>`

## academics_offering

**Model:** `academics.Offering` · **Source:** [backend/apps/academics/models.py](../backend/apps/academics/models.py)

Delivered subject in a period/section with teachers, weights and correction delegation.

**Workflow / roles:** `offerings/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `head_correction_review` | `head_correction_review` | `boolean` | no | — |
| `course_id` | `course` | `uuid` | no | indexed; FK → `academics_course.id`; on_delete=PROTECT |
| `term_id` | `term` | `uuid` | no | indexed; FK → `academics_term.id`; on_delete=PROTECT |
| `section_id` | `section` | `uuid` | yes | indexed; FK → `academics_section.id`; on_delete=PROTECT |
| `title` | `title` | `varchar(150)` | no | — |
| `archived` | `archived` | `boolean` | no | — |
| `assignment_weight` | `assignment_weight` | `smallint` | no | — |
| `quiz_weight` | `quiz_weight` | `smallint` | no | — |
| `manual_weight` | `manual_weight` | `smallint` | no | — |

**Additional constraints and indexes:**

- `weights_total_100`: `<CheckConstraint: condition=(AND: ('assignment_weight', <CombinedExpression: Value(100) - F(quiz_weight) - F(manual_weight)>)) name='weights_total_100'>`

## academics_offering_teachers

**Model:** `academics.Offering_teachers` · **Source:** [backend/apps/academics/models.py](../backend/apps/academics/models.py)

Join table for academics.Offering; stores links rather than a separate workflow.

**Workflow / roles:** Follows the owning academics.Offering workflow and authorization.

**Institute scope:** Inherited through the owning relation; no direct institute column.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `bigint` | no | PRIMARY KEY |
| `offering_id` | `offering` | `uuid` | no | indexed; FK → `academics_offering.id`; on_delete=CASCADE |
| `user_id` | `user` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=CASCADE |

**Additional constraints and indexes:**

- Unique together: `offering, user`.

## academics_program

**Model:** `academics.Program` · **Source:** [backend/apps/academics/models.py](../backend/apps/academics/models.py)

Degree/college stream or school class; configured structure and duration.

**Workflow / roles:** `programs/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `duration_terms` | `duration_terms` | `smallint` | no | — |
| `structure` | `structure` | `varchar(12)` | no | — |
| `active` | `active` | `boolean` | no | — |
| `name` | `name` | `varchar(120)` | no | — |
| `unit_id` | `unit` | `uuid` | yes | indexed; FK → `academics_unit.id`; on_delete=PROTECT |

**Additional constraints and indexes:**

- `unique_program_unit`: `<UniqueConstraint: fields=('institute', 'unit', 'name') name='unique_program_unit'>`
- `unique_program_without_unit`: `<UniqueConstraint: fields=('institute', 'name') name='unique_program_without_unit' condition=(AND: ('unit__isnull', True))>`

## academics_progressiondecision

**Model:** `academics.ProgressionDecision` · **Source:** [backend/apps/academics/models.py](../backend/apps/academics/models.py)

Persisted reviewed progression/repetition/correction/terminal decision and evidence.

**Workflow / roles:** `memberships/{id}/progress/`; `academic-decisions/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `membership_id` | `membership` | `uuid` | no | indexed; FK → `accounts_membership.id`; on_delete=PROTECT |
| `previous_id` | `previous` | `uuid` | no | UNIQUE; indexed; FK → `academics_studentplacement.id`; on_delete=PROTECT |
| `placement_id` | `placement` | `uuid` | yes | indexed; FK → `academics_studentplacement.id`; on_delete=PROTECT |
| `operation` | `operation` | `varchar(12)` | no | — |
| `reason` | `reason` | `varchar(1000)` | no | — |
| `actor_id` | `actor` | `uuid` | yes | indexed; FK → `accounts_user.id`; on_delete=SET_NULL |
| `evidence` | `evidence` | `jsonb` | no | — |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## academics_section

**Model:** `academics.Section` · **Source:** [backend/apps/academics/models.py](../backend/apps/academics/models.py)

Division of a program/class, optionally linked to a batch.

**Workflow / roles:** `sections/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `batch_id` | `batch` | `uuid` | yes | indexed; FK → `academics_admissionbatch.id`; on_delete=PROTECT |
| `active` | `active` | `boolean` | no | — |
| `name` | `name` | `varchar(100)` | no | — |
| `program_id` | `program` | `uuid` | no | indexed; FK → `academics_program.id`; on_delete=PROTECT |

**Additional constraints and indexes:**

- `unique_section_program`: `<UniqueConstraint: fields=('program', 'name') name='unique_section_program'>`

## academics_studentplacement

**Model:** `academics.StudentPlacement` · **Source:** [backend/apps/academics/models.py](../backend/apps/academics/models.py)

Current or ended academic placement with actor/reason.

**Workflow / roles:** `memberships/{id}/placements/`; `memberships/{id}/transfer/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `stage` | `stage` | `smallint` | yes | — |
| `term_id` | `term` | `uuid` | yes | indexed; FK → `academics_term.id`; on_delete=PROTECT |
| `end_reason` | `end_reason` | `varchar(12)` | no | — |
| `membership_id` | `membership` | `uuid` | no | indexed; FK → `accounts_membership.id`; on_delete=PROTECT |
| `program_id` | `program` | `uuid` | no | indexed; FK → `academics_program.id`; on_delete=PROTECT |
| `batch_id` | `batch` | `uuid` | yes | indexed; FK → `academics_admissionbatch.id`; on_delete=PROTECT |
| `year_id` | `year` | `uuid` | yes | indexed; FK → `academics_year.id`; on_delete=PROTECT |
| `section_id` | `section` | `uuid` | yes | indexed; FK → `academics_section.id`; on_delete=PROTECT |
| `ended_at` | `ended_at` | `timestamp with time zone` | yes | — |
| `reason` | `reason` | `varchar(1000)` | no | — |
| `actor_id` | `actor` | `uuid` | yes | indexed; FK → `accounts_user.id`; on_delete=SET_NULL |

**Additional constraints and indexes:**

- `one_current_student_placement`: `<UniqueConstraint: fields=('membership',) name='one_current_student_placement' condition=(AND: ('ended_at__isnull', True))>`

## academics_term

**Model:** `academics.Term` · **Source:** [backend/apps/academics/models.py](../backend/apps/academics/models.py)

Academic period with type, lifecycle status and dates within a year.

**Workflow / roles:** `terms/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `period_type` | `period_type` | `varchar(12)` | no | — |
| `status` | `status` | `varchar(12)` | no | — |
| `name` | `name` | `varchar(80)` | no | — |
| `year_id` | `year` | `uuid` | no | indexed; FK → `academics_year.id`; on_delete=PROTECT |
| `start` | `start` | `date` | no | — |
| `end` | `end` | `date` | no | — |

**Additional constraints and indexes:**

- `unique_term`: `<UniqueConstraint: fields=('year', 'name') name='unique_term'>`
- `term_dates`: `<CheckConstraint: condition=(AND: ('end__gte', F(start))) name='term_dates'>`

## academics_timetable

**Model:** `academics.Timetable` · **Source:** [backend/apps/academics/models.py](../backend/apps/academics/models.py)

Day/time/location for an offering.

**Workflow / roles:** `timetable/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `offering_id` | `offering` | `uuid` | no | indexed; FK → `academics_offering.id`; on_delete=CASCADE |
| `day` | `day` | `smallint` | no | — |
| `start` | `start` | `time` | no | — |
| `end` | `end` | `time` | no | — |
| `location` | `location` | `varchar(150)` | no | — |

**Additional constraints and indexes:**

- `meeting_times`: `<CheckConstraint: condition=(AND: ('end__gt', F(start))) name='meeting_times'>`

## academics_unit

**Model:** `academics.Unit` · **Source:** [backend/apps/academics/models.py](../backend/apps/academics/models.py)

Department or hierarchical academic unit; schools reject this structure.

**Workflow / roles:** `units/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `name` | `name` | `varchar(150)` | no | — |
| `kind` | `kind` | `varchar(30)` | no | — |
| `parent_id` | `parent` | `uuid` | yes | indexed; FK → `academics_unit.id`; on_delete=PROTECT |

**Additional constraints and indexes:**

- `unique_unit`: `<UniqueConstraint: fields=('institute', 'name') name='unique_unit'>`

## academics_year

**Model:** `academics.Year` · **Source:** [backend/apps/academics/models.py](../backend/apps/academics/models.py)

Institute academic calendar year.

**Workflow / roles:** `years/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `name` | `name` | `varchar(50)` | no | — |
| `start` | `start` | `date` | no | — |
| `end` | `end` | `date` | no | — |

**Additional constraints and indexes:**

- `unique_year`: `<UniqueConstraint: fields=('institute', 'name') name='unique_year'>`
- `year_dates`: `<CheckConstraint: condition=(AND: ('end__gte', F(start))) name='year_dates'>`

## accounts_accountinvitation

**Model:** `accounts.AccountInvitation` · **Source:** [backend/apps/accounts/models.py](../backend/apps/accounts/models.py)

Versioned password-setup invitation and transport/acceptance state.

**Workflow / roles:** `memberships/{id}/resend-invitation/`; `auth/password-confirm/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Global identity/configuration/framework table. Access is mediated by its workflow, not a direct institute column.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `bigint` | no | PRIMARY KEY |
| `user_id` | `user` | `uuid` | no | UNIQUE; indexed; FK → `accounts_user.id`; on_delete=CASCADE |
| `version` | `version` | `uuid` | no | — |
| `issued_at` | `issued_at` | `timestamp with time zone` | no | — |
| `expires_at` | `expires_at` | `timestamp with time zone` | no | — |
| `accepted_at` | `accepted_at` | `timestamp with time zone` | yes | — |
| `email_status` | `email_status` | `varchar(12)` | no | — |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## accounts_institute

**Model:** `accounts.Institute` · **Source:** [backend/apps/accounts/models.py](../backend/apps/accounts/models.py)

Tenant boundary, type, branding terminology and grading/policy JSON.

**Workflow / roles:** `institutes/`; `platform/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Global identity/configuration/framework table. Access is mediated by its workflow, not a direct institute column.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `name` | `name` | `varchar(180)` | no | — |
| `code` | `code` | `varchar(50)` | no | UNIQUE; indexed |
| `kind` | `kind` | `varchar(20)` | no | — |
| `active` | `active` | `boolean` | no | — |
| `terminology` | `terminology` | `jsonb` | no | — |
| `grading_rules` | `grading_rules` | `jsonb` | no | — |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## accounts_membership

**Model:** `accounts.Membership` · **Source:** [backend/apps/accounts/models.py](../backend/apps/accounts/models.py)

One user role per institute, student identity/section and teaching eligibility.

**Workflow / roles:** `memberships/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `user_id` | `user` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=CASCADE |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `role` | `role` | `varchar(12)` | no | — |
| `unit_id` | `unit` | `uuid` | yes | indexed; FK → `academics_unit.id`; on_delete=PROTECT |
| `active` | `active` | `boolean` | no | — |
| `removed_at` | `removed_at` | `timestamp with time zone` | yes | — |
| `display_name` | `display_name` | `varchar(150)` | no | — |
| `student_identifier` | `student_identifier` | `varchar(64)` | no | — |
| `section_id` | `section` | `uuid` | yes | indexed; FK → `academics_section.id`; on_delete=PROTECT |
| `can_teach` | `can_teach` | `boolean` | no | — |

**Additional constraints and indexes:**

- `unique_membership`: `<UniqueConstraint: fields=('user', 'institute') name='unique_membership'>`
- `unique_institute_student_identifier`: `<UniqueConstraint: fields=('institute', 'student_identifier') name='unique_institute_student_identifier' condition=(NOT (AND: ('student_identifier', '')))>`

## accounts_membership_eligible_units

**Model:** `accounts.Membership_eligible_units` · **Source:** [backend/apps/accounts/models.py](../backend/apps/accounts/models.py)

Join table for accounts.Membership; stores links rather than a separate workflow.

**Workflow / roles:** Follows the owning accounts.Membership workflow and authorization.

**Institute scope:** Inherited through the owning relation; no direct institute column.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `bigint` | no | PRIMARY KEY |
| `membership_id` | `membership` | `uuid` | no | indexed; FK → `accounts_membership.id`; on_delete=CASCADE |
| `unit_id` | `unit` | `uuid` | no | indexed; FK → `academics_unit.id`; on_delete=CASCADE |

**Additional constraints and indexes:**

- Unique together: `membership, unit`.

## accounts_platformconfiguration

**Model:** `accounts.PlatformConfiguration` · **Source:** [backend/apps/accounts/models.py](../backend/apps/accounts/models.py)

Singleton public platform name/support/login notice.

**Workflow / roles:** `platform-settings/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Global identity/configuration/framework table. Access is mediated by its workflow, not a direct institute column.

**Sensitive information:** Public platform branding fields; writes restricted to Super Admin.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `smallint` | no | PRIMARY KEY |
| `platform_name` | `platform_name` | `varchar(32)` | no | — |
| `support_email` | `support_email` | `varchar(254)` | no | — |
| `login_notice` | `login_notice` | `varchar(400)` | no | — |
| `updated_at` | `updated_at` | `timestamp with time zone` | no | — |

**Additional constraints and indexes:**

- `single_platform_configuration`: `<CheckConstraint: condition=(AND: ('id', 1)) name='single_platform_configuration'>`

## accounts_teacherappointment

**Model:** `accounts.TeacherAppointment` · **Source:** [backend/apps/accounts/models.py](../backend/apps/accounts/models.py)

Audited active/withdrawn department appointment of a teaching member.

**Workflow / roles:** `teacher-appointments/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `membership_id` | `membership` | `uuid` | no | indexed; FK → `accounts_membership.id`; on_delete=PROTECT |
| `unit_id` | `unit` | `uuid` | no | indexed; FK → `academics_unit.id`; on_delete=PROTECT |
| `active` | `active` | `boolean` | no | — |
| `reason` | `reason` | `varchar(1000)` | no | — |
| `updated_at` | `updated_at` | `timestamp with time zone` | no | — |

**Additional constraints and indexes:**

- `unique_department_teacher_appointment`: `<UniqueConstraint: fields=('membership', 'unit') name='unique_department_teacher_appointment'>`

## accounts_user

**Model:** `accounts.User` · **Source:** [backend/apps/accounts/models.py](../backend/apps/accounts/models.py)

Global login identity, profile image and notification preference.

**Workflow / roles:** `auth/me/`; `auth/avatar/`; `platform-users/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Global identity/configuration/framework table. Access is mediated by its workflow, not a direct institute column.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `password` | `password` | `varchar(128)` | no | — |
| `last_login` | `last_login` | `timestamp with time zone` | yes | — |
| `is_superuser` | `is_superuser` | `boolean` | no | — |
| `username` | `username` | `varchar(150)` | no | UNIQUE |
| `first_name` | `first_name` | `varchar(150)` | no | — |
| `last_name` | `last_name` | `varchar(150)` | no | — |
| `is_staff` | `is_staff` | `boolean` | no | — |
| `is_active` | `is_active` | `boolean` | no | — |
| `date_joined` | `date_joined` | `timestamp with time zone` | no | — |
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `email` | `email` | `varchar(254)` | no | UNIQUE |
| `avatar` | `avatar` | `varchar(100)` | no | — |
| `notify_academic` | `notify_academic` | `boolean` | no | — |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## accounts_user_groups

**Model:** `accounts.User_groups` · **Source:** [backend/apps/accounts/models.py](../backend/apps/accounts/models.py)

Join table for accounts.User; stores links rather than a separate workflow.

**Workflow / roles:** Follows the owning accounts.User workflow and authorization.

**Institute scope:** Inherited through the owning relation; no direct institute column.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `bigint` | no | PRIMARY KEY |
| `user_id` | `user` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=CASCADE |
| `group_id` | `group` | `integer` | no | indexed; FK → `auth_group.id`; on_delete=CASCADE |

**Additional constraints and indexes:**

- Unique together: `user, group`.

## accounts_user_user_permissions

**Model:** `accounts.User_user_permissions` · **Source:** [backend/apps/accounts/models.py](../backend/apps/accounts/models.py)

Join table for accounts.User; stores links rather than a separate workflow.

**Workflow / roles:** Follows the owning accounts.User workflow and authorization.

**Institute scope:** Inherited through the owning relation; no direct institute column.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `bigint` | no | PRIMARY KEY |
| `user_id` | `user` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=CASCADE |
| `permission_id` | `permission` | `integer` | no | indexed; FK → `auth_permission.id`; on_delete=CASCADE |

**Additional constraints and indexes:**

- Unique together: `user, permission`.

## auth_group

**Model:** `auth.Group` · **Source:** Django / DRF framework

Django framework permission grouping; institute roles use Membership instead.

**Workflow / roles:** Django framework operations; no ordinary LMS resource endpoint.

**Institute scope:** Global identity/configuration/framework table. Access is mediated by its workflow, not a direct institute column.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `integer` | no | PRIMARY KEY |
| `name` | `name` | `varchar(150)` | no | UNIQUE |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## auth_group_permissions

**Model:** `auth.Group_permissions` · **Source:** Django / DRF framework

Join table for auth.Group; stores links rather than a separate workflow.

**Workflow / roles:** Follows the owning auth.Group workflow and authorization.

**Institute scope:** Inherited through the owning relation; no direct institute column.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `integer` | no | PRIMARY KEY |
| `group_id` | `group` | `integer` | no | indexed; FK → `auth_group.id`; on_delete=CASCADE |
| `permission_id` | `permission` | `integer` | no | indexed; FK → `auth_permission.id`; on_delete=CASCADE |

**Additional constraints and indexes:**

- Unique together: `group, permission`.

## auth_permission

**Model:** `auth.Permission` · **Source:** Django / DRF framework

Django permission definition, maintained by migrations.

**Workflow / roles:** Django framework operations; no ordinary LMS resource endpoint.

**Institute scope:** Global identity/configuration/framework table. Access is mediated by its workflow, not a direct institute column.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `integer` | no | PRIMARY KEY |
| `name` | `name` | `varchar(255)` | no | — |
| `content_type_id` | `content_type` | `integer` | no | indexed; FK → `django_content_type.id`; on_delete=CASCADE |
| `codename` | `codename` | `varchar(100)` | no | — |

**Additional constraints and indexes:**

- Unique together: `content_type, codename`.

## django_admin_log

**Model:** `admin.LogEntry` · **Source:** Django / DRF framework

Django admin-site action history, separate from the LMS Audit model.

**Workflow / roles:** Django framework operations; no ordinary LMS resource endpoint.

**Institute scope:** Global identity/configuration/framework table. Access is mediated by its workflow, not a direct institute column.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `integer` | no | PRIMARY KEY |
| `action_time` | `action_time` | `timestamp with time zone` | no | — |
| `user_id` | `user` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=CASCADE |
| `content_type_id` | `content_type` | `integer` | yes | indexed; FK → `django_content_type.id`; on_delete=SET_NULL |
| `object_id` | `object_id` | `text` | yes | — |
| `object_repr` | `object_repr` | `varchar(200)` | no | — |
| `action_flag` | `action_flag` | `smallint` | no | — |
| `change_message` | `change_message` | `text` | no | — |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## django_content_type

**Model:** `contenttypes.ContentType` · **Source:** Django / DRF framework

Django application/model identity used by framework permissions and logs.

**Workflow / roles:** Django framework operations; no ordinary LMS resource endpoint.

**Institute scope:** Global identity/configuration/framework table. Access is mediated by its workflow, not a direct institute column.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `integer` | no | PRIMARY KEY |
| `app_label` | `app_label` | `varchar(100)` | no | — |
| `model` | `model` | `varchar(100)` | no | — |

**Additional constraints and indexes:**

- Unique together: `app_label, model`.

## django_migrations

**Model:** `migrations.Migration` · **Source:** Django / DRF framework

Applied Django migration names and timestamps. Never edit to repair application data.

**Workflow / roles:** Django framework operations; no ordinary LMS resource endpoint.

**Institute scope:** Global identity/configuration/framework table. Access is mediated by its workflow, not a direct institute column.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `bigint` | no | PRIMARY KEY |
| `app` | `app` | `varchar(255)` | no | — |
| `name` | `name` | `varchar(255)` | no | — |
| `applied` | `applied` | `timestamp with time zone` | no | — |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## django_session

**Model:** `sessions.Session` · **Source:** Django / DRF framework

Server-side signed session data and expiry. Treat session keys/data as secrets.

**Workflow / roles:** Django framework operations; no ordinary LMS resource endpoint.

**Institute scope:** Global identity/configuration/framework table. Access is mediated by its workflow, not a direct institute column.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `session_key` | `session_key` | `varchar(40)` | no | PRIMARY KEY |
| `session_data` | `session_data` | `text` | no | — |
| `expire_date` | `expire_date` | `timestamp with time zone` | no | indexed |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## insights_activity

**Model:** `insights.Activity` · **Source:** [backend/apps/insights/models.py](../backend/apps/insights/models.py)

Recorded learning event used as actual analytics context.

**Workflow / roles:** `analytics/`; `analytics/trends/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `user_id` | `user` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=CASCADE |
| `offering_id` | `offering` | `uuid` | no | indexed; FK → `academics_offering.id`; on_delete=CASCADE |
| `kind` | `kind` | `varchar(50)` | no | — |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## insights_analysisitem

**Model:** `insights.AnalysisItem` · **Source:** [backend/apps/insights/models.py](../backend/apps/insights/models.py)

One learner's pending/ready/insufficient/failed result in a class run.

**Workflow / roles:** `class-analysis/{id}/items/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `run_id` | `run` | `uuid` | no | indexed; FK → `insights_analysisrun.id`; on_delete=CASCADE |
| `student_id` | `student` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=PROTECT |
| `status` | `status` | `varchar(24)` | no | — |
| `result` | `result` | `jsonb` | no | — |

**Additional constraints and indexes:**

- `one_student_per_analysis`: `<UniqueConstraint: fields=('run', 'student') name='one_student_per_analysis'>`

## insights_analysisrun

**Model:** `insights.AnalysisRun` · **Source:** [backend/apps/insights/models.py](../backend/apps/insights/models.py)

Persistent class-analysis request and lifecycle.

**Workflow / roles:** `class-analysis/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `offering_id` | `offering` | `uuid` | no | indexed; FK → `academics_offering.id`; on_delete=PROTECT |
| `requested_by_id` | `requested_by` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=PROTECT |
| `status` | `status` | `varchar(12)` | no | — |
| `finished_at` | `finished_at` | `timestamp with time zone` | yes | — |

**Additional constraints and indexes:**

- `one_active_class_analysis`: `<UniqueConstraint: fields=('offering',) name='one_active_class_analysis' condition=(AND: ('status', 'active'))>`

## insights_audit

**Model:** `insights.Audit` · **Source:** [backend/apps/insights/models.py](../backend/apps/insights/models.py)

Institutional actor/action/object/detail history.

**Workflow / roles:** `audit/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `actor_id` | `actor` | `uuid` | yes | indexed; FK → `accounts_user.id`; on_delete=SET_NULL |
| `action` | `action` | `varchar(100)` | no | — |
| `object_id` | `object_id` | `varchar(60)` | no | — |
| `detail` | `detail` | `jsonb` | no | — |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## insights_prediction

**Model:** `insights.Prediction` · **Source:** [backend/apps/insights/models.py](../backend/apps/insights/models.py)

Versioned probability, feature snapshot, warning, digest and context.

**Workflow / roles:** `predictions/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `student_id` | `student` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=CASCADE |
| `offering_id` | `offering` | `uuid` | no | indexed; FK → `academics_offering.id`; on_delete=CASCADE |
| `probability` | `probability` | `double precision` | no | — |
| `category` | `category` | `varchar(15)` | no | — |
| `version` | `version` | `varchar(80)` | no | — |
| `features` | `features` | `jsonb` | no | — |
| `warning` | `warning` | `text` | no | — |
| `input_digest` | `input_digest` | `varchar(64)` | no | — |
| `context` | `context` | `jsonb` | no | — |

**Additional constraints and indexes:**

- `unique_prediction_input`: `<UniqueConstraint: fields=('offering', 'student', 'input_digest') name='unique_prediction_input' condition=(NOT (AND: ('input_digest', '')))>`

## learning_announcement

**Model:** `learning.Announcement` · **Source:** [backend/apps/learning/models.py](../backend/apps/learning/models.py)

Published institute, unit or offering message.

**Workflow / roles:** `announcements/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `title` | `title` | `varchar(180)` | no | — |
| `body` | `body` | `text` | no | — |
| `unit_id` | `unit` | `uuid` | yes | indexed; FK → `academics_unit.id`; on_delete=CASCADE |
| `offering_id` | `offering` | `uuid` | yes | indexed; FK → `academics_offering.id`; on_delete=CASCADE |
| `published` | `published` | `boolean` | no | — |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## learning_assignment

**Model:** `learning.Assignment` · **Source:** [backend/apps/learning/models.py](../backend/apps/learning/models.py)

Published assignment, maximum marks, deadline and submission rules.

**Workflow / roles:** `assignments/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `offering_id` | `offering` | `uuid` | no | indexed; FK → `academics_offering.id`; on_delete=CASCADE |
| `title` | `title` | `varchar(180)` | no | — |
| `description` | `description` | `text` | no | — |
| `file` | `file` | `varchar(100)` | no | — |
| `max_marks` | `max_marks` | `integer` | no | — |
| `due_at` | `due_at` | `timestamp with time zone` | no | — |
| `published` | `published` | `boolean` | no | — |
| `allow_late` | `allow_late` | `boolean` | no | — |
| `allow_resubmit` | `allow_resubmit` | `boolean` | no | — |

**Additional constraints and indexes:**

- `assignment_positive_marks`: `<CheckConstraint: condition=(AND: ('max_marks__gt', 0)) name='assignment_positive_marks'>`

## learning_attempt

**Model:** `learning.Attempt` · **Source:** [backend/apps/learning/models.py](../backend/apps/learning/models.py)

Student quiz session, server deadline, answers, automatic/manual marks.

**Workflow / roles:** `attempts/`; `quizzes/{id}/start/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `finalized` | `finalized` | `boolean` | no | — |
| `quiz_id` | `quiz` | `uuid` | no | indexed; FK → `learning_quiz.id`; on_delete=CASCADE |
| `student_id` | `student` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=PROTECT |
| `started_at` | `started_at` | `timestamp with time zone` | no | — |
| `deadline` | `deadline` | `timestamp with time zone` | no | — |
| `submitted_at` | `submitted_at` | `timestamp with time zone` | yes | — |
| `answers` | `answers` | `jsonb` | no | — |
| `marks` | `marks` | `numeric(7, 2)` | yes | — |
| `manual_marks` | `manual_marks` | `jsonb` | no | — |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## learning_attendance

**Model:** `learning.Attendance` · **Source:** [backend/apps/learning/models.py](../backend/apps/learning/models.py)

One recorded status for a student and meeting.

**Workflow / roles:** `attendance/`; `attendance-sessions/{id}/mark/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `session_id` | `session` | `uuid` | no | indexed; FK → `learning_attendancesession.id`; on_delete=CASCADE |
| `student_id` | `student` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=PROTECT |
| `status` | `status` | `varchar(10)` | no | — |

**Additional constraints and indexes:**

- `unique_attendance`: `<UniqueConstraint: fields=('session', 'student') name='unique_attendance'>`

## learning_attendancesession

**Model:** `learning.AttendanceSession` · **Source:** [backend/apps/learning/models.py](../backend/apps/learning/models.py)

Dated class meeting and finalization lock.

**Workflow / roles:** `attendance-sessions/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `offering_id` | `offering` | `uuid` | no | indexed; FK → `academics_offering.id`; on_delete=CASCADE |
| `finalized` | `finalized` | `boolean` | no | — |
| `date` | `date` | `date` | no | — |
| `title` | `title` | `varchar(120)` | no | — |

**Additional constraints and indexes:**

- `unique_meeting`: `<UniqueConstraint: fields=('offering', 'date', 'title') name='unique_meeting'>`

## learning_bankquestion

**Model:** `learning.BankQuestion` · **Source:** [backend/apps/learning/models.py](../backend/apps/learning/models.py)

Reusable author/unit-scoped question copied into assessments.

**Workflow / roles:** `question-bank/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `author_id` | `author` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=PROTECT |
| `unit_id` | `unit` | `uuid` | yes | indexed; FK → `academics_unit.id`; on_delete=PROTECT |
| `prompt` | `prompt` | `text` | no | — |
| `kind` | `kind` | `varchar(10)` | no | — |
| `options` | `options` | `jsonb` | no | — |
| `answer` | `answer` | `text` | no | — |
| `marks` | `marks` | `integer` | no | — |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## learning_completion

**Model:** `learning.Completion` · **Source:** [backend/apps/learning/models.py](../backend/apps/learning/models.py)

Student lesson completion, unique per lesson/student.

**Workflow / roles:** `lessons/{id}/complete/`; `analytics/learner-progress/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `lesson_id` | `lesson` | `uuid` | no | indexed; FK → `learning_lesson.id`; on_delete=CASCADE |
| `student_id` | `student` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=CASCADE |

**Additional constraints and indexes:**

- `unique_completion`: `<UniqueConstraint: fields=('lesson', 'student') name='unique_completion'>`

## learning_correctionrequest

**Model:** `learning.CorrectionRequest` · **Source:** [backend/apps/learning/models.py](../backend/apps/learning/models.py)

Original/proposed record snapshot with requester/reviewer and decision.

**Workflow / roles:** `corrections/`; `academic-control/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `offering_id` | `offering` | `uuid` | no | indexed; FK → `academics_offering.id`; on_delete=CASCADE |
| `kind` | `kind` | `varchar(20)` | no | — |
| `target` | `target` | `uuid` | no | — |
| `requester_id` | `requester` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=PROTECT |
| `reviewer_id` | `reviewer` | `uuid` | yes | indexed; FK → `accounts_user.id`; on_delete=PROTECT |
| `original` | `original` | `jsonb` | no | — |
| `proposed` | `proposed` | `jsonb` | no | — |
| `reason` | `reason` | `varchar(1000)` | no | — |
| `decision_reason` | `decision_reason` | `varchar(1000)` | no | — |
| `status` | `status` | `varchar(12)` | no | — |
| `decided_at` | `decided_at` | `timestamp with time zone` | yes | — |
| `emergency` | `emergency` | `boolean` | no | — |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## learning_lesson

**Model:** `learning.Lesson` · **Source:** [backend/apps/learning/models.py](../backend/apps/learning/models.py)

Published/scheduled body/video lesson, optionally within module.

**Workflow / roles:** `lessons/`; `lessons/{id}/complete/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `offering_id` | `offering` | `uuid` | no | indexed; FK → `academics_offering.id`; on_delete=CASCADE |
| `module_id` | `module` | `uuid` | yes | indexed; FK → `learning_module.id`; on_delete=SET_NULL |
| `title` | `title` | `varchar(180)` | no | — |
| `body` | `body` | `text` | no | — |
| `video_url` | `video_url` | `varchar(200)` | no | — |
| `position` | `position` | `integer` | no | — |
| `published` | `published` | `boolean` | no | — |
| `visible_at` | `visible_at` | `timestamp with time zone` | yes | — |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## learning_manualgrade

**Model:** `learning.ManualGrade` · **Source:** [backend/apps/learning/models.py](../backend/apps/learning/models.py)

Released or draft practical/oral/other manual assessment score.

**Workflow / roles:** `manual-grades/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `offering_id` | `offering` | `uuid` | no | indexed; FK → `academics_offering.id`; on_delete=CASCADE |
| `finalized` | `finalized` | `boolean` | no | — |
| `student_id` | `student` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=PROTECT |
| `title` | `title` | `varchar(180)` | no | — |
| `marks` | `marks` | `numeric(7, 2)` | no | — |
| `max_marks` | `max_marks` | `integer` | no | — |
| `feedback` | `feedback` | `text` | no | — |
| `released` | `released` | `boolean` | no | — |

**Additional constraints and indexes:**

- `manual_grade_range`: `<CheckConstraint: condition=(AND: ('marks__gte', 0), ('marks__lte', F(max_marks)), ('max_marks__gt', 0)) name='manual_grade_range'>`
- `unique_manual_grade`: `<UniqueConstraint: fields=('offering', 'student', 'title') name='unique_manual_grade'>`

## learning_material

**Model:** `learning.Material` · **Source:** [backend/apps/learning/models.py](../backend/apps/learning/models.py)

Private downloadable file associated with lesson and offering.

**Workflow / roles:** `materials/`; `materials/{id}/download/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `offering_id` | `offering` | `uuid` | no | indexed; FK → `academics_offering.id`; on_delete=CASCADE |
| `lesson_id` | `lesson` | `uuid` | no | indexed; FK → `learning_lesson.id`; on_delete=CASCADE |
| `title` | `title` | `varchar(180)` | no | — |
| `file` | `file` | `varchar(100)` | no | — |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## learning_module

**Model:** `learning.Module` · **Source:** [backend/apps/learning/models.py](../backend/apps/learning/models.py)

Ordered learning-content group inside an offering.

**Workflow / roles:** `modules/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `offering_id` | `offering` | `uuid` | no | indexed; FK → `academics_offering.id`; on_delete=CASCADE |
| `title` | `title` | `varchar(150)` | no | — |
| `position` | `position` | `integer` | no | — |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## learning_notification

**Model:** `learning.Notification` · **Source:** [backend/apps/learning/models.py](../backend/apps/learning/models.py)

User/institute scoped in-app event, read state and destination.

**Workflow / roles:** `notifications/`; `notifications/{id}/read/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `destination` | `destination` | `varchar(300)` | no | — |
| `user_id` | `user` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=CASCADE |
| `title` | `title` | `varchar(180)` | no | — |
| `body` | `body` | `text` | no | — |
| `read` | `read` | `boolean` | no | — |
| `event_key` | `event_key` | `varchar(180)` | yes | — |

**Additional constraints and indexes:**

- `unique_notification_event`: `<UniqueConstraint: fields=('user', 'institute', 'event_key') name='unique_notification_event'>`

## learning_question

**Model:** `learning.Question` · **Source:** [backend/apps/learning/models.py](../backend/apps/learning/models.py)

Ordered MCQ, boolean or short-answer item belonging to a quiz.

**Workflow / roles:** `questions/`; `quizzes/{id}/bulk-questions/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `position` | `position` | `integer` | no | — |
| `quiz_id` | `quiz` | `uuid` | no | indexed; FK → `learning_quiz.id`; on_delete=CASCADE |
| `prompt` | `prompt` | `text` | no | — |
| `kind` | `kind` | `varchar(10)` | no | — |
| `options` | `options` | `jsonb` | no | — |
| `answer` | `answer` | `text` | no | — |
| `marks` | `marks` | `integer` | no | — |

**Additional constraints and indexes:**

Field-level PK, uniqueness and FK indexes listed above; no additional model Meta constraints.

## learning_quiz

**Model:** `learning.Quiz` · **Source:** [backend/apps/learning/models.py](../backend/apps/learning/models.py)

Timed/windowed assessment with attempt and release settings.

**Workflow / roles:** `quizzes/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `offering_id` | `offering` | `uuid` | no | indexed; FK → `academics_offering.id`; on_delete=CASCADE |
| `title` | `title` | `varchar(180)` | no | — |
| `published` | `published` | `boolean` | no | — |
| `opens_at` | `opens_at` | `timestamp with time zone` | no | — |
| `closes_at` | `closes_at` | `timestamp with time zone` | no | — |
| `minutes` | `minutes` | `integer` | no | — |
| `attempt_limit` | `attempt_limit` | `smallint` | no | — |
| `released` | `released` | `boolean` | no | — |

**Additional constraints and indexes:**

- `quiz_window`: `<CheckConstraint: condition=(AND: ('closes_at__gt', F(opens_at))) name='quiz_window'>`
- `quiz_limits`: `<CheckConstraint: condition=(AND: ('attempt_limit__gt', 0), ('minutes__gt', 0)) name='quiz_limits'>`

## learning_submission

**Model:** `learning.Submission` · **Source:** [backend/apps/learning/models.py](../backend/apps/learning/models.py)

Student work, submission date, release/grade/feedback and finalization state.

**Workflow / roles:** `assignments/{id}/submit/`; `submissions/` See the linked feature and permission maps for read/write rules.

**Institute scope:** Direct `institute_id` tenant key; API queries must also enforce role, department, course and self scope.

**Sensitive information:** Yes: identity, academic, operational or relationship data. Do not publish row exports. User.password, session_data, invitation versions and authentication identifiers need particular care.

| Column | Model field | PostgreSQL type | Nullable | Key / relation / index |
|---|---|---|---|---|
| `id` | `id` | `uuid` | no | PRIMARY KEY |
| `institute_id` | `institute` | `uuid` | no | indexed; FK → `accounts_institute.id`; on_delete=CASCADE |
| `created_at` | `created_at` | `timestamp with time zone` | no | — |
| `finalized` | `finalized` | `boolean` | no | — |
| `assignment_id` | `assignment` | `uuid` | no | indexed; FK → `learning_assignment.id`; on_delete=CASCADE |
| `student_id` | `student` | `uuid` | no | indexed; FK → `accounts_user.id`; on_delete=PROTECT |
| `text` | `text` | `text` | no | — |
| `file` | `file` | `varchar(100)` | no | — |
| `submitted_at` | `submitted_at` | `timestamp with time zone` | no | — |
| `late` | `late` | `boolean` | no | — |
| `marks` | `marks` | `numeric(7, 2)` | yes | — |
| `feedback` | `feedback` | `text` | no | — |
| `released` | `released` | `boolean` | no | — |

**Additional constraints and indexes:**

- `unique_submission`: `<UniqueConstraint: fields=('assignment', 'student') name='unique_submission'>`

import { BookOpen, CheckCircle2, ChevronDown, Settings2 } from "lucide-react";
import { RelationSelect } from "../../../components/RelationSelect";
import { ErrorState } from "../../../components/shared";
import { Button } from "../../../components/ui/button";
import { inputStyle, responsiveGridStyle } from "./resourceFormPresentation";
import { useResourceFormController } from "./useResourceFormController";
export function CourseOfferingForm({
  form,
}: {
  form: ReturnType<typeof useResourceFormController>;
}) {
  const {
    fields,
    handleSubmit,
    submit,
    subjectMode,
    changeSubjectMode,
    renderField,
    createdSubject,
    newSubjectName,
    setNewSubjectName,
    newSubjectCode,
    setNewSubjectCode,
    newSubjectCredits,
    setNewSubjectCredits,
    showSubjectDetails,
    setShowSubjectDetails,
    institution,
    newSubjectUnit,
    setNewSubjectUnit,
    Array,
    newSubjectDescription,
    setNewSubjectDescription,
    showAdvanced,
    setShowAdvanced,
    gradingFields,
    role,
    directAssignment,
    assignmentOverride,
    setAssignmentOverride,
    advancedCourseFields,
    courseValidationError,
    error,
    onDone,
    isSubmitting,
  } = form;
  const courseField = fields.find((field) => field.key === "course");
  const titleField = fields.find((field) => field.key === "title");
  const termField = fields.find((field) => field.key === "term");
  const sectionField = fields.find((field) => field.key === "section");
  return (
    <form
      className="record-form course-create-wizard"

      onSubmit={handleSubmit(submit)}

      style={{
        width: "100%",

        minWidth: 0,
      }}
    >
             {" "}
      <div
        className="account-wizard-section"

        style={{
          paddingBottom: 12,
        }}
      >
                 {" "}
        <div
          className="account-section-heading"

          style={{
            marginBottom: 14,
          }}
        >
                      <BookOpen size={21} />           {" "}
          <div>
                          <h3>Create course</h3>             {" "}
            <p>
                              Add a course to your                 institute.  
                         {" "}
            </p>
                       {" "}
          </div>
                   {" "}
        </div>
                 {" "}
        <div
          style={{
            display: "grid",

            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",

            gap: 8,

            marginBottom: 18,
          }}
        >
                     {" "}
          <Button
            type="button"

            variant={subjectMode === "existing" ? "default" : "outline"}

            onClick={() => changeSubjectMode("existing")}
          >
                          Existing subject            {" "}
          </Button>
                     {" "}
          <Button
            type="button"

            variant={subjectMode === "new" ? "default" : "outline"}

            onClick={() => changeSubjectMode("new")}
          >
                          + New subject            {" "}
          </Button>
                   {" "}
        </div>
                 {" "}
        {subjectMode === "existing" ? (
          <div
            style={{
              marginBottom: 16,
            }}
          >
                          {courseField && renderField(courseField)}         
             {" "}
          </div>
        ) : (
          <div
            style={{
              padding: 16,

              border: "1px solid #dce7df",

              borderRadius: 12,

              marginBottom: 16,

              background: "#fbfcfb",
            }}
          >
                         {" "}
            {createdSubject ? (
              <div
                className="account-wizard-note"

                style={{
                  margin: 0,
                }}
              >
                                  <CheckCircle2 size={18} />                 {" "}
                <span>
                                     {" "}
                  <strong>
                                          {createdSubject.name}                 
                     {" "}
                  </strong>{" "}
                                      (                    {" "}
                  {createdSubject.code}                    ) is saved. It      
                                will be reused when                     creating
                  this course.                  {" "}
                </span>
                               {" "}
              </div>
            ) : (
              <>
                                 {" "}
                <div
                  className="account-fields-grid"

                  style={responsiveGridStyle}
                >
                                     {" "}
                  <label
                    className="account-form-field"

                    style={{
                      display: "grid",

                      gap: 8,

                      minWidth: 0,
                    }}
                  >
                                         {" "}
                    <span>
                                              Subject name *                    
                       {" "}
                    </span>
                                         {" "}
                    <input
                      type="text"

                      value={newSubjectName}

                      onChange={(event) =>
                        setNewSubjectName(event.target.value)
                      }

                      placeholder="e.g. Programming Fundamentals"

                      maxLength={255}

                      style={inputStyle}
                    />
                                       {" "}
                  </label>
                                     {" "}
                  <label
                    className="account-form-field"

                    style={{
                      display: "grid",

                      gap: 8,

                      minWidth: 0,
                    }}
                  >
                                         {" "}
                    <span>
                                              Subject code *                    
                       {" "}
                    </span>
                                         {" "}
                    <input
                      type="text"

                      value={newSubjectCode}

                      onChange={(event) =>
                        setNewSubjectCode(event.target.value)
                      }

                      placeholder="e.g. CS101"

                      maxLength={100}

                      style={inputStyle}
                    />
                                       {" "}
                  </label>
                                     {" "}
                  <label
                    className="account-form-field"

                    style={{
                      display: "grid",

                      gap: 8,

                      minWidth: 0,
                    }}
                  >
                                         {" "}
                    <span>
                                              Credit hours                    
                       {" "}
                    </span>
                                         {" "}
                    <input
                      type="number"

                      min="0"

                      step="0.25"

                      value={newSubjectCredits}

                      onChange={(event) =>
                        setNewSubjectCredits(event.target.value)
                      }

                      placeholder="e.g. 3"

                      style={inputStyle}
                    />
                                       {" "}
                  </label>
                                   {" "}
                </div>
                                 {" "}
                <button
                  type="button"

                  aria-expanded={showSubjectDetails}

                  onClick={() => setShowSubjectDetails((current) => !current)}

                  style={{
                    display: "flex",

                    alignItems: "center",

                    justifyContent: "space-between",

                    width: "100%",

                    padding: "12px 0",

                    marginTop: 8,

                    border: 0,

                    background: "transparent",

                    color: "inherit",

                    cursor: "pointer",

                    font: "inherit",

                    fontSize: 13,
                  }}
                >
                                     {" "}
                  <span>
                                          More subject                      
                    details                      {" "}
                    <span className="muted">
                                              (optional)                    
                       {" "}
                    </span>
                                       {" "}
                  </span>
                                     {" "}
                  <ChevronDown
                    size={16}

                    style={{
                      transform: showSubjectDetails
                        ? "rotate(180deg)"
                        : undefined,
                    }}
                  />
                                   {" "}
                </button>
                                 {" "}
                {showSubjectDetails && (
                  <div
                    style={{
                      display: "grid",

                      gap: 16,

                      paddingTop: 8,
                    }}
                  >
                                         {" "}
                    <div
                      className="account-fields-grid"

                      style={responsiveGridStyle}
                    >
                                             {" "}
                      <div
                        className="account-form-field"

                        style={{
                          minWidth: 0,
                        }}
                      >
                                                 {" "}
                        {institution.departments && (
                          <RelationSelect
                            source="units"

                            label="Academic unit"

                            value={newSubjectUnit}

                            onChange={(value) =>
                              setNewSubjectUnit(
                                Array.isArray(value) ? value[0] || "" : value,
                              )
                            }

                            compact
                          />
                        )}
                                               {" "}
                      </div>
                                           {" "}
                    </div>
                                         {" "}
                    <label
                      className="account-form-field"

                      style={{
                        display: "grid",

                        gap: 8,

                        width: "100%",
                      }}
                    >
                                             {" "}
                      <span>
                                                  Description                  
                             {" "}
                      </span>
                                             {" "}
                      <textarea
                        rows={2}

                        value={newSubjectDescription}

                        onChange={(event) =>
                          setNewSubjectDescription(event.target.value)
                        }

                        placeholder="Optional description"

                        style={{
                          ...inputStyle,

                          resize: "vertical",
                        }}
                      />
                                           {" "}
                    </label>
                                       {" "}
                  </div>
                )}
                               {" "}
              </>
            )}
                       {" "}
          </div>
        )}
                 {" "}
        <div
          style={{
            marginBottom: 16,
          }}
        >
                      {titleField && renderField(titleField)}         {" "}
        </div>
                 {" "}
        <div
          className="account-fields-grid"

          style={responsiveGridStyle}
        >
                      {termField && renderField(termField)}           {" "}
          {sectionField && renderField(sectionField)}         {" "}
        </div>
                 {" "}
        <p
          className="muted"

          style={{
            fontSize: 12,

            marginTop: 12,

            marginBottom: 0,
          }}
        >
                      Teacher assignment can             be completed later by  
                    the Department Head.          {" "}
        </p>
               {" "}
      </div>
             {" "}
      <div className="course-advanced-settings">
                 {" "}
        <button
          type="button"

          className="course-advanced-toggle"

          aria-expanded={showAdvanced}

          onClick={() => setShowAdvanced((current) => !current)}
        >
                     {" "}
          <span>
                          <Settings2 size={17} />              Advanced settings
                       {" "}
          </span>
                     {" "}
          <ChevronDown
            size={16}

            style={{
              transform: showAdvanced ? "rotate(180deg)" : undefined,
            }}
          />
                   {" "}
        </button>
                 {" "}
        {showAdvanced && (
          <div
            className="course-advanced-content"

            style={{
              padding: "16px 0",

              display: "grid",

              gap: 18,
            }}
          >
                         {" "}
            {gradingFields.length > 0 && (
              <div>
                                 {" "}
                <h4
                  style={{
                    marginTop: 0,

                    marginBottom: 8,
                  }}
                >
                                      Grading weights                  {" "}
                </h4>
                                 {" "}
                <p
                  className="muted"

                  style={{
                    fontSize: 12,

                    marginBottom: 12,
                  }}
                >
                                      Default: 60%                    
                  assignments, 40%                     quizzes, 0% other.      
                             {" "}
                </p>
                                 {" "}
                <div
                  className="account-fields-grid"

                  style={responsiveGridStyle}
                >
                                      {gradingFields.map(renderField)}         
                         {" "}
                </div>
                               {" "}
              </div>
            )}
                         {" "}
            {role === "admin" && !directAssignment && (
              <label
                style={{
                  display: "flex",

                  alignItems: "flex-start",

                  justifyContent: "flex-start",

                  gap: 10,

                  marginTop: 8,

                  cursor: "pointer",
                }}
              >
                                 {" "}
                <input
                  type="checkbox"

                  checked={assignmentOverride}

                  style={{
                    width: 16,

                    height: 16,

                    flex: "0 0 16px",

                    marginTop: 3,
                  }}

                  onChange={(event) =>
                    setAssignmentOverride(event.target.checked)
                  }
                />
                                 {" "}
                <span>
                                      Administrative                     teacher
                  assignment                     override                    {" "}
                  <small
                    className="muted"

                    style={{
                      display: "block",

                      marginTop: 4,
                    }}
                  >
                                          Requires a                      
                    reason and is                       audited.                
                       {" "}
                  </small>
                                   {" "}
                </span>
                               {" "}
              </label>
            )}
                         {" "}
            {advancedCourseFields.length > 0 && (
              <div
                className="account-fields-grid"

                style={responsiveGridStyle}
              >
                                  {advancedCourseFields.map(renderField)}       
                       {" "}
              </div>
            )}
                       {" "}
          </div>
        )}
               {" "}
      </div>
             {" "}
      {courseValidationError && (
        <small
          className="field-error"

          role="alert"
        >
                      {courseValidationError}         {" "}
        </small>
      )}
              {!!error && <ErrorState error={error} />}       {" "}
      <div
        className="account-wizard-footer"

        style={{
          display: "flex",

          alignItems: "center",

          justifyContent: "space-between",

          gap: 12,

          marginTop: 16,

          paddingTop: 14,

          paddingBottom: 12,

          borderTop: "1px solid #e2e9e4",

          position: "static",
        }}
      >
                 {" "}
        <Button
          type="button"

          variant="outline"

          onClick={onDone}
        >
                      Cancel          {" "}
        </Button>
                 {" "}
        <Button
          type="submit"

          disabled={isSubmitting}
        >
                      {isSubmitting ? "Creating course…" : "Create course"}     
             {" "}
        </Button>
               {" "}
      </div>
           {" "}
    </form>
  );
}

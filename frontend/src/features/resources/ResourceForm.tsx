import { UserRound } from "lucide-react";
import { ErrorState } from "../../components/shared";
import { Button } from "../../components/ui/button";
import { AccountProvisioningForm } from "./forms/AccountProvisioningForm";
import { CourseOfferingForm } from "./forms/CourseOfferingForm";
import { responsiveGridStyle } from "./forms/resourceFormPresentation";
import {
  useResourceFormController,
  type ResourceFormProps,
} from "./forms/useResourceFormController";
export function ResourceForm(props: ResourceFormProps) {
  const form = useResourceFormController(props);
  const {
    handleSubmit,
    submit,
    resource,
    role,
    directAssignment,
    assignmentOverride,
    setAssignmentOverride,
    initial,
    isPeople,
    fields,
    renderField,
    error,
    courseValidationError,
    onDone,
    isSubmitting,
  } = form;
  if (form.useCourseWizard) return <CourseOfferingForm form={form} />;
  if (form.useAccountWizard) return <AccountProvisioningForm form={form} />;
  return (
    <form
      onSubmit={handleSubmit(submit)}

      className="record-form"

      style={{
        display: "flex",

        flexDirection: "column",

        gap: 20,

        width: "100%",

        minWidth: 0,

        boxSizing: "border-box",
      }}
    >
           {" "}
      {resource === "offerings" && role === "admin" && !directAssignment && (
        <label
          style={{
            display: "flex",

            alignItems: "flex-start",

            justifyContent: "flex-start",

            gap: 10,

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

            onChange={(event) => setAssignmentOverride(event.target.checked)}
          />
                     {" "}
          <span>
                          Use administrative               teaching-assignment  
                        override              {" "}
            <small
              className="muted"

              style={{
                display: "block",

                marginTop: 4,
              }}
            >
                              Department Heads                 normally assign  
                            teachers. Override                 changes require a
                              reason and are                 audited.          
                 {" "}
            </small>
                       {" "}
          </span>
                   {" "}
        </label>
      )}
           {" "}
      {initial && isPeople && (
        <div
          className="account-section-heading"

          style={{
            marginBottom: 4,
          }}
        >
                    <UserRound size={21} />         {" "}
          <div>
                       {" "}
            <h3>
                            Edit              {" "}
              {initial.role === "admin"
                ? "Institute Admin"
                : initial.role === "head"
                  ? "Department Head"
                  : initial.role === "teacher"
                    ? "Teacher"
                    : initial.role === "student"
                      ? "Student"
                      : "Account"}
                         {" "}
            </h3>
                       {" "}
            <p>
                            Update the details               relevant to this  
                          account. Access               permissions and        
                    academic placement               are managed              
              separately.            {" "}
            </p>
                     {" "}
          </div>
                 {" "}
        </div>
      )}
           {" "}
      {fields.length > 0 ? (
        <div
          className="account-fields-grid"

          style={responsiveGridStyle}
        >
                    {fields.map(renderField)}       {" "}
        </div>
      ) : (
        <p className="muted">
                    No editable fields are           available for this        
            record.        {" "}
        </p>
      )}
            {!!error && <ErrorState error={error} />}     {" "}
      {courseValidationError && (
        <small
          className="field-error"

          role="alert"
        >
                    {courseValidationError}       {" "}
        </small>
      )}
           {" "}
      <div
        className="form-footer"

        style={{
          display: "flex",

          alignItems: "center",

          justifyContent: "flex-end",

          gap: 12,

          flexWrap: "wrap",

          paddingTop: 18,

          borderTop: "1px solid #e4ebe6",

          marginTop: 4,
        }}
      >
               {" "}
        <Button
          type="button"

          variant="outline"

          onClick={onDone}
        >
                    Cancel        {" "}
        </Button>
               {" "}
        <Button
          type="submit"

          disabled={
            isSubmitting || !!(initial && isPeople && fields.length === 0)
          }
        >
                   {" "}
          {isSubmitting
            ? "Saving…"
            : initial
              ? "Save changes"
              : "Create record"}
                 {" "}
        </Button>
             {" "}
      </div>
         {" "}
    </form>
  );
}

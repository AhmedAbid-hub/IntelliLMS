import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { ErrorState } from "../../../components/shared";
import { Button } from "../../../components/ui/button";
import { accountTypes, responsiveGridStyle } from "./resourceFormPresentation";
import { useResourceFormController } from "./useResourceFormController";
export function AccountProvisioningForm({
  form,
}: {
  form: ReturnType<typeof useResourceFormController>;
}) {
  const {
    handleSubmit,
    submit,
    accountStep,
    institution,
    chooseAccountType,
    accountType,
    personalFields,
    renderField,
    String,
    getValues,
    academicFields,
    error,
    onDone,
    setAccountStep,
    nextAccountStep,
    isSubmitting,
  } = form;
  return (
    <form
      className="record-form account-wizard"

      onSubmit={handleSubmit(submit)}

      style={{
        width: "100%",

        minWidth: 0,
      }}
    >
             {" "}
      <div className="account-wizard-progress">
                 {" "}
        {["Account type", "Personal details", "Academic details"].map(
          (label, index) => (
            <div
              key={label}

              className={
                index === accountStep
                  ? "account-progress-step active"
                  : index < accountStep
                    ? "account-progress-step complete"
                    : "account-progress-step"
              }
            >
                             {" "}
              <span>
                                 {" "}
                {index < accountStep ? <CheckCircle2 size={17} /> : index + 1} 
                             {" "}
              </span>
                             {" "}
              <small>                  {label}                </small>         
                 {" "}
            </div>
          ),
        )}
               {" "}
      </div>
             {" "}
      {accountStep === 0 && (
        <div className="account-wizard-section">
                      <h3>              Who are you adding?             </h3>   
                 {" "}
          <p className="muted">
                          Choose the person's               role to see only the
                          relevant account               fields.          
             {" "}
          </p>
                     {" "}
          <div className="account-type-grid">
                         {" "}
            {accountTypes
              .filter(
                (type) => institution.departments || type.value !== "head",
              )
              .map((type) => (
                <button
                  key={type.value}

                  type="button"

                  className="account-type-card"

                  onClick={() => chooseAccountType(type.value)}
                >
                                     {" "}
                  <span className="account-type-icon">
                                         {" "}
                    {type.value === "student" ? (
                      <GraduationCap size={26} />
                    ) : type.value === "teacher" ? (
                      <BookOpen size={26} />
                    ) : (
                      <UsersRound size={26} />
                    )}
                                       {" "}
                  </span>
                                     {" "}
                  <strong>
                                          {type.title}                   {" "}
                  </strong>
                                     {" "}
                  <small>
                                          {type.description}                 
                     {" "}
                  </small>
                                     {" "}
                  <span className="account-type-action">
                                          Continue                      {" "}
                    <ArrowRight size={15} />                   {" "}
                  </span>
                                   {" "}
                </button>
              ))}
                       {" "}
          </div>
                   {" "}
        </div>
      )}
             {" "}
      {accountStep === 1 && (
        <div className="account-wizard-section">
                     {" "}
          <div className="account-section-heading">
                          <UserRound size={21} />             {" "}
            <div>
                             {" "}
              <h3>
                                  Personal                   information        
                       {" "}
              </h3>
                             {" "}
              <p>
                                  Enter the basic                   details for
                the                   new                  {" "}
                {accountType === "head" ? "Department Head" : accountType}      
                            account.                {" "}
              </p>
                           {" "}
            </div>
                       {" "}
          </div>
                     {" "}
          <div
            className="account-fields-grid"

            style={responsiveGridStyle}
          >
                          {personalFields.map(renderField)}           {" "}
          </div>
                   {" "}
        </div>
      )}
             {" "}
      {accountStep === 2 && (
        <div className="account-wizard-section">
                     {" "}
          <div className="account-section-heading">
                          <ShieldCheck size={21} />             {" "}
            <div>
                             {" "}
              <h3>
                                 {" "}
                {accountType === "student"
                  ? "Student academic details"
                  : accountType === "teacher"
                    ? "Teacher eligibility"
                    : "Department Head details"}
                               {" "}
              </h3>
                             {" "}
              <p>
                                 {" "}
                {accountType === "student"
                  ? "Complete the learner's academic information."
                  : accountType === "teacher"
                    ? "Authorize eligible teaching departments. The Department Head appoints teachers separately."
                    : "Select the academic department associated with this Department Head account."}
                               {" "}
              </p>
                           {" "}
            </div>
                       {" "}
          </div>
                     {" "}
          <div className="account-review-summary">
                         {" "}
            <span>                Account type               </span>           
             {" "}
            <strong>
                             {" "}
              {accountType === "head"
                ? "Department Head"
                : accountType === "student"
                  ? "Student"
                  : "Teacher"}
                           {" "}
            </strong>
                          <span>                Username               </span> 
                       {" "}
            <strong>
                              {String(getValues("username") || "Not entered")} 
                         {" "}
            </strong>
                          <span>                Email               </span>     
                   {" "}
            <strong>
                              {String(getValues("email") || "Not entered")}     
                     {" "}
            </strong>
                       {" "}
          </div>
                     {" "}
          <div
            className="account-fields-grid"

            style={responsiveGridStyle}
          >
                          {academicFields.map(renderField)}           {" "}
          </div>
                     {" "}
          {accountType === "teacher" && (
            <p className="account-wizard-note">
                              <ShieldCheck size={17} />                Creating
              this                 account does not                 appoint the
              teacher                 to a department or                 assign
              courses.              {" "}
            </p>
          )}
                     {" "}
          {accountType === "head" && (
            <p className="account-wizard-note">
                              <ShieldCheck size={17} />                This is
              an                 administrative                 role. Confirm
              the                 correct academic                 department
              before                 creating the                 account.      
                     {" "}
            </p>
          )}
                   {" "}
        </div>
      )}
              {!!error && <ErrorState error={error} />}       {" "}
      <div className="account-wizard-footer">
                 {" "}
        <Button
          type="button"

          variant="outline"

          onClick={() => {
            if (accountStep === 0) {
              onDone();
            } else {
              setAccountStep((current) => current - 1);
            }
          }}
        >
                      <ArrowLeft size={16} />           {" "}
          {accountStep === 0 ? "Cancel" : "Back"}         {" "}
        </Button>
                 {" "}
        {accountStep === 1 && (
          <Button
            type="button"

            onClick={() => void nextAccountStep()}
          >
                          Continue               <ArrowRight size={16} />       
               {" "}
          </Button>
        )}
                 {" "}
        {accountStep === 2 && (
          <Button
            type="submit"

            disabled={isSubmitting}
          >
                         {" "}
            {isSubmitting
              ? "Creating account…"
              : `Create ${
                  accountType === "head" ? "Department Head" : accountType
                }`}
                       {" "}
          </Button>
        )}
               {" "}
      </div>
           {" "}
    </form>
  );
}

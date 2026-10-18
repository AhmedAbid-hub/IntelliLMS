Continue working on IntelliLMS from the current repository state.

Our next task is to complete the existing AI/ML student performance prediction system using a **real publicly available educational dataset instead of synthetic training data**.

First, inspect the existing ML implementation, training scripts, feature extraction, model artifacts, prediction APIs, and frontend integration. Preserve the working LMS and reuse the existing infrastructure. Do not rebuild the AI module from scratch or create a separate prediction system.

Find and download a suitable real educational dataset from a reputable public source. Prioritize the Open University Learning Analytics Dataset (OULAD), UCI Student Performance Dataset, or UCI Predict Students' Dropout and Academic Success dataset. You may choose another reputable dataset if it better matches IntelliLMS.

Verify the dataset's source, license, actual features, prediction target, and suitability for our LMS. Choose the dataset that best matches the information IntelliLMS already collects, especially attendance, assignments, quizzes, assessments, grades, and learning activity.

Do not choose a dataset solely because it is large or popular. The trained model must be compatible with the actual information available when IntelliLMS makes predictions.

Train the model using the real dataset. Use appropriate preprocessing, missing-value handling, reproducible train/validation/test splits, and leakage prevention. Compare a simple baseline with suitable machine-learning algorithms, such as Random Forest, Logistic Regression, or Gradient Boosting, depending on the prediction target.

Select the best appropriate model based on genuine evaluation results, not assumed accuracy. Report relevant metrics such as accuracy, precision, recall, F1 and confusion matrix for classification, or MAE, RMSE and R² for regression. Use only metrics suitable for the chosen task.

Ensure that the model is predicting an academically meaningful outcome and that the target is available for training without leaking future information into prediction features.

Save the trained model using the existing trusted artifact mechanism, with its preprocessing pipeline, feature schema, model version, dataset source, training configuration, and measured evaluation metrics.

Integrate the trained model into the existing IntelliLMS AI functionality. The existing Analyze Class feature, individual predictions, prediction history, and authorized teacher dashboards should continue working.

Actual predictions inside IntelliLMS must use the student's recorded LMS information, not randomly generated values. Map the available LMS indicators correctly to the model's trained features. Never invent missing attendance, quiz, assignment, or activity values.

If the selected public dataset does not support the current feature schema, adapt the training and inference pipeline carefully using only genuinely compatible features. Do not silently substitute unrelated features or train on one feature schema and predict with another. If no defensible feature mapping exists, document the incompatibility rather than deploying a misleading model.

Keep predictions isolated by institute, course, and authorized user. Preserve existing permission rules, historical predictions, and model versioning. Do not use predictions to automatically penalize students, change grades, or make academic progression decisions.

Update the AI frontend where necessary so teachers can see predicted outcomes, recorded academic indicators, prediction dates, model information, and clear insufficient-data messages. Keep the existing design consistent.

Clearly distinguish actual student academic records from model predictions. Label the results as experimental predictions evaluated on an external public dataset. Do not claim they have been validated on IntelliLMS students.

Create a repeatable demonstration using the existing fictional demo accounts and academic records, without overwriting the real application database. Demonstrate that an authorized teacher can open a course, run Analyze Class, obtain predictions from the newly trained real-data model, and view the results.

Run the relevant backend, PostgreSQL, frontend, and Chromium browser tests. Verify that the model loads correctly, inference works, prediction history is preserved, and the existing academic functionality remains intact.

Update the existing project documentation with the selected dataset, source URL, license, number of records, actual input features, prediction target, algorithm, preprocessing, training/test split, measured evaluation results, model limitations, and instructions to reproduce training.

Also update the AI section of the SRS or project documentation where appropriate, but do not invent performance numbers or claim real-world deployment.

Preserve all existing PostgreSQL records, migrations, academic functionality, security rules, verified backups, and working frontend components. Do not reset databases, reseed existing institutes, or introduce unrelated architectural changes.

**Complete this task autonomously in one continuous session if possible.** Do not stop after downloading the dataset or training a model; continue through integration, testing, and documentation. Do not ask me to approve ordinary implementation choices. If execution is interrupted by a usage limit, record the exact checkpoint so that "Continue" resumes the unfinished work without repetition.

At the end, report:
- Which real dataset was selected and why.
- How many real records were used.
- Which algorithm was trained.
- The actual measured evaluation metrics.
- Which IntelliLMS features the model uses.
- Whether predictions work through the existing teacher interface.
- Which automated tests passed.
- Any remaining limitations or blockers.

Start now and finish the complete real-data ML training and integration task.
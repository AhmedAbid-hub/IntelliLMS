import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { post, type RecordData } from "../../lib/api";
import { RelationSelect } from "../../components/RelationSelect";
import { notifySaved } from "../../components/ToastProvider";
import { Dialog } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/shared";
export function BankCopy({ row }: { row: RecordData }) {
  const [open, setOpen] = useState(false);
  const [quiz, setQuiz] = useState("");
  const [error, setError] = useState<unknown>();
  const client = useQueryClient();
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Copy to quiz
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Copy bank question">
        <p>{String(row.prompt)}</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await post(`question-bank/${row.id}/copy-to-quiz/`, { quiz });
              await client.invalidateQueries();
              notifySaved("Question copied to quiz.");
              setOpen(false);
            } catch (err) {
              setError(err);
            }
          }}
        >
          <RelationSelect
            source="quizzes"
            label="Destination quiz"
            required
            value={quiz}
            onChange={(value) => setQuiz(String(value))}
          />
          {!!error && <ErrorState error={error} />}
          <Button>Copy question</Button>
        </form>
      </Dialog>
    </>
  );
}

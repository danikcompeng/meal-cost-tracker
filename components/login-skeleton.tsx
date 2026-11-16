import { FieldShape, Skeleton, onPage } from "./skeleton";

// The login form while it loads (login-form.tsx): the email box and the
// two buttons, as grey shapes, so the space under the title isn't blank.
export function LoginSkeleton() {
  return (
    <Skeleton label="Loading…" className="space-y-4">
      <FieldShape labelWidth="w-10" shade={onPage} />
      <div className={`h-11 rounded-lg ${onPage}`} />
      <div className="h-11" />
    </Skeleton>
  );
}

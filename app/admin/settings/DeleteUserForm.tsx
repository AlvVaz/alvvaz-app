"use client";

import type { MouseEvent } from "react";

import { useConfirmDialog } from "@/components/ui/confirm-dialog";

type DeleteUserFormProps = {
  action: (formData: FormData) => void;
  userId: string;
  label: string;
  disabled?: boolean;
  className?: string;
};

export default function DeleteUserForm({
  action,
  userId,
  label,
  disabled,
  className,
}: DeleteUserFormProps) {
  const { confirm, dialog } = useConfirmDialog();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const submitter = event.currentTarget;
    confirm(`Seguro que quieres eliminar ${label}?`, () => {
      submitter.form?.requestSubmit(submitter);
    });
  };

  return (
    <form action={action}>
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={disabled}
        className={className}
        onClick={handleClick}
      >
        Eliminar
      </button>
      {dialog}
    </form>
  );
}

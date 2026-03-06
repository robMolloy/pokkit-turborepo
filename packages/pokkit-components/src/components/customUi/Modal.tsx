import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { create } from "zustand";
import type { ReactNode } from "react";
import { Button } from "./button";

type TState = ReactNode | null;
type TStore = {
  data: TState;
  setData: (data: TState) => void;
};

const useInitModalStore = create<TStore>()((set) => ({
  data: null,
  setData: (data) => set({ data }),
}));

export const useModalStore = () => {
  const { data, setData } = useInitModalStore();

  return { data, setData, close: () => setData(null) };
};

export const Modal = () => {
  const modalStore = useModalStore();

  return (
    <Dialog open={!!modalStore.data} onOpenChange={() => modalStore.setData(null)}>
      {modalStore.data}
    </Dialog>
  );
};

export const ModalContent = (p: {
  title: string;
  description: string;
  content?: ReactNode;
  footer?: ReactNode;
}) => {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{p.title}</DialogTitle>
        <DialogDescription>{p.description}</DialogDescription>
      </DialogHeader>
      {p.content}
      {p.footer && <DialogFooter>{p.footer}</DialogFooter>}
    </DialogContent>
  );
};

export const ConfirmationModalContent = (p: {
  title: string;
  description: string;
  content?: ReactNode;
  onConfirm: () => void;
}) => {
  const modalStore = useModalStore();
  return (
    <ModalContent
      title={p.title}
      description={p.description}
      content={p.content}
      footer={
        <div className="flex gap-4">
          <Button variant="destructive" onClick={() => modalStore.close()}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await p.onConfirm();
              modalStore.close();
            }}
          >
            Confirm
          </Button>
        </div>
      }
    />
  );
};

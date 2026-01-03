import { ReactNode } from "react";
import { Toaster } from "react-hot-toast";

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            duration: 3000,

            style: {
              color: "green",
              background: "#ffff",
            },
          },
          error: {
            duration: 3000,
            style: {
              color: "red",
              background: "#ffff",
            },
          },

          
        }}
      />
    </>
  );
};

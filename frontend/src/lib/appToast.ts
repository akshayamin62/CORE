import toast from 'react-hot-toast';

/** Convenience helpers — UI is rendered globally by AppToaster */
export const appToast = {
  success(message: string) {
    return toast.success(message, { duration: 4500 });
  },
  error(message: string) {
    return toast.error(message, { duration: 6000 });
  },
  loading(message: string) {
    return toast.loading(message);
  },
  dismiss(id?: string) {
    if (id) toast.dismiss(id);
    else toast.dismiss();
  },
};

export default appToast;

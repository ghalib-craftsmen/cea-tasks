import { Toaster as HotToaster } from 'react-hot-toast';
import type { ToasterProps } from 'react-hot-toast';

export function Toaster(props?: ToasterProps) {
  return <HotToaster {...props} />;
}

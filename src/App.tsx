import "./App.css";
import EditorLayout from "./editor/EditorLayout";
import { AssetsEditorPage } from './AssetsEditor';

import { JobProvider } from './AssetsEditor/context/JobContext';
import { JobNotification } from './AssetsEditor/components/JobNotification';

export default function App() {
  return (
    <JobProvider>
      <AssetsEditorPage />
      <JobNotification />
    </JobProvider>
  );
}


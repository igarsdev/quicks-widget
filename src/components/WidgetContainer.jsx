import { useWidget } from "../context/WidgetContext";
import Messaging from "./messaging/Messaging";
import Todo from "./todo/Todo";

export default function WidgetContainer() {
  const { activeTab } = useWidget();

  return (
    <section
      aria-label="Quicks widget"
      className="fixed bottom-20 right-2 z-40 flex h-[min(500px,calc(100vh-6rem))] w-[min(372px,calc(100vw-1rem))] flex-col overflow-hidden rounded-[3px] border border-[#cfcfcf] bg-white shadow-[0_14px_36px_rgba(0,0,0,0.24)] sm:bottom-22 sm:right-4 sm:w-[min(372px,calc(100vw-1.5rem))] md:bottom-24 md:right-6"
    >
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "messaging" ? <Messaging /> : <Todo />}
      </div>
    </section>
  );
}

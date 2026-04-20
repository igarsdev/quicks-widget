import { createContext, useContext, useState } from "react";

const WidgetContext = createContext(null);

export function WidgetProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("messaging");
  const [messagingView, setMessagingView] = useState("list");
  const [selectedThreadId, setSelectedThreadId] = useState(null);

  const resetMessagingState = () => {
    setMessagingView("list");
    setSelectedThreadId(null);
  };

  const openWidget = () => {
    if (activeTab === "messaging") {
      resetMessagingState();
    }

    setIsOpen(true);
  };
  const closeWidget = () => setIsOpen(false);
  const toggleWidget = () => setIsOpen((current) => !current);
  const openThread = (threadId) => {
    setSelectedThreadId(threadId);
    setMessagingView("detail");
  };
  const goToMessagingList = () => {
    setMessagingView("list");
    setSelectedThreadId(null);
  };

  return (
    <WidgetContext.Provider
      value={{
        isOpen,
        activeTab,
        setActiveTab,
        messagingView,
        selectedThreadId,
        openWidget,
        closeWidget,
        toggleWidget,
        openThread,
        goToMessagingList,
        resetMessagingState,
        setMessagingView,
      }}
    >
      {children}
    </WidgetContext.Provider>
  );
}

export function useWidget() {
  const context = useContext(WidgetContext);

  if (!context) {
    throw new Error("useWidget must be used inside WidgetProvider");
  }

  return context;
}

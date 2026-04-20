import { WidgetProvider, useWidget } from "./context/WidgetContext";
import FloatingButton from "./components/FloatingButton";
import WidgetContainer from "./components/WidgetContainer";

function WidgetSurface() {
  const { isOpen } = useWidget();

  return (
    <>
      <FloatingButton />
      {isOpen ? (
        <div
          className="fixed inset-0 z-30 bg-[rgba(38,38,38,0.68)]"
          aria-hidden="true"
        />
      ) : null}
      {isOpen ? <WidgetContainer /> : null}
    </>
  );
}

export default function App() {
  return (
    <WidgetProvider>
      <div className="relative min-h-screen overflow-hidden bg-[#179a7e] text-quicks-ink">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
          <h1 className="select-none text-center text-[clamp(3rem,13vw,7.5rem)] font-black leading-[0.88] tracking-[-0.05em] text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.04)] sm:text-[clamp(4rem,10vw,7.5rem)]">
            Simple
            <br />
            Quicks
          </h1>
        </div>
        <WidgetSurface />
      </div>
    </WidgetProvider>
  );
}

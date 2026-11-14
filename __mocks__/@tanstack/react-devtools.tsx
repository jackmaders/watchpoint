import type { TanStackDevtoolsReactInit } from "@tanstack/react-devtools";

function TanStackDevtools({ plugins }: TanStackDevtoolsReactInit) {
  const list = plugins ?? [];
  return (
    <div>
      {list.map((plugin, index) => {
        const content =
          typeof plugin.render === "function"
            ? plugin.render(document.createElement("div"), {
                devtoolsOpen: false,
                theme: "dark",
              })
            : plugin.render;
        return <div key={String(plugin.id ?? index)}>{content}</div>;
      })}
    </div>
  );
}

export { TanStackDevtools };

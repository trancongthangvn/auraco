import { Node, mergeAttributes } from "@tiptap/core";

export interface VideoOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      setVideo: (src: string) => ReturnType;
    };
    youtube: {
      setYoutubeVideo: (src: string) => ReturnType;
    };
  }
}

const Video = Node.create<VideoOptions>({
  name: "video",
  group: "block",
  atom: true,
  addOptions() {
    return { HTMLAttributes: {} };
  },
  addAttributes() {
    return {
      src: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "video" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        controls: "true",
        class: "w-full max-w-full",
      }),
    ];
  },
  addCommands() {
    return {
      setVideo:
        (src: string) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { src } }),
    };
  },
});

/**
 * A YouTube embed rendered as a responsive 16:9 iframe.
 *
 * The wrapper carries inline styles rather than Tailwind classes on purpose:
 * the same HTML is stored in Postgres and re-rendered on the public article
 * page (and inside the admin preview), where the editor's utility classes are
 * not guaranteed to be in the compiled CSS. The server's HTML sanitizer keeps
 * iframes whose src is on youtube.com / youtube-nocookie.com / player.vimeo.com.
 */
const Youtube = Node.create<VideoOptions>({
  name: "youtube",
  group: "block",
  atom: true,
  draggable: true,
  addOptions() {
    return { HTMLAttributes: {} };
  },
  addAttributes() {
    return {
      src: { default: null },
    };
  },
  parseHTML() {
    return [
      {
        tag: "iframe[src]",
        getAttrs: (element) => {
          const src = (element as HTMLElement).getAttribute("src") || "";
          return /youtube\.com|youtube-nocookie\.com|youtu\.be/i.test(src)
            ? { src }
            : false;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        "data-youtube-embed": "",
        style: "position:relative;width:100%;padding-top:56.25%;margin:1rem 0",
      },
      [
        "iframe",
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          style: "position:absolute;inset:0;width:100%;height:100%;border:0",
          frameborder: "0",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          allowfullscreen: "true",
          referrerpolicy: "strict-origin-when-cross-origin",
        }),
      ],
    ];
  },
  addCommands() {
    return {
      setYoutubeVideo:
        (src: string) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { src } }),
    };
  },
});

export { Youtube };
export default Video;

import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "system",
  useSystemColorMode: false,
};
const pair = (light: string, dark: string) => ({ default: light, _dark: dark });

// "Ledger" identity: warm paper + deep green ink + vermilion accent. Every colour is a semantic token with a designed dark value.
export const theme = extendTheme({
  config,
  fonts: {
    heading: '"Instrument Serif", Georgia, serif',
    body: '"Schibsted Grotesk", "Helvetica Neue", Arial, sans-serif',
    mono: '"Martian Mono", ui-monospace, Menlo, monospace',
  },
  semanticTokens: {
    colors: {
      bg: pair("#ece6d6", "#0c1511"),
      surface: pair("#f8f4e9", "#13211a"),
      ink: pair("#14231c", "#e9e4d3"),
      mute: pair("#5f6d63", "#93a398"),
      line: pair("#d3cbb4", "#26382e"),
      rule: pair("#14231c0d", "#e9e4d30a"),
      accent: pair("#e8501a", "#ff6a2b"),
      side: pair("#12241c", "#08100c"),
      ok: pair("#1f7a54", "#4fcf93"),
      warn: pair("#b87800", "#e5b238"),
      danger: pair("#b3261e", "#ff7b72"),
      info: pair("#0f6b8f", "#5cc0e6"),
    },
  },
  styles: {
    global: {
      body: {
        bg: "bg",
        color: "ink",
        backgroundImage:
          "linear-gradient(var(--chakra-colors-rule) 1px, transparent 1px)",
        backgroundSize: "100% 30px",
      },
      "@media (prefers-reduced-motion: reduce)": {
        "*": { animation: "none !important", transition: "none !important" },
      },
      "@media print": {
        ".no-print": { display: "none !important" },
        body: { background: "white !important", color: "black !important" },
      },
    },
  },
  components: {
    Heading: { baseStyle: { fontWeight: 400, letterSpacing: "-0.01em" } },
    Button: {
      baseStyle: { borderRadius: "4px", fontWeight: 600 },
      variants: {
        solid: {
          bg: "accent",
          color: "white",
          _hover: {
            bg: "accent",
            filter: "brightness(1.08)",
            transform: "translateY(-1px)",
            _disabled: { bg: "accent" },
          },
          _active: { filter: "brightness(.95)" },
        },
        outline: {
          borderColor: "ink",
          color: "ink",
          _hover: { bg: "ink", color: "bg" },
        },
        ghost: {
          color: "ink",
          _hover: { bg: "rule", filter: "brightness(.97)" },
        },
        danger: {
          bg: "danger",
          color: "white",
          _hover: { filter: "brightness(1.08)" },
        },
      },
      defaultProps: { variant: "solid" },
    },
    Input: {
      variants: {
        outline: {
          field: {
            bg: "surface",
            borderColor: "line",
            borderRadius: "4px",
            _focusVisible: {
              borderColor: "accent",
              boxShadow: "0 0 0 1px var(--chakra-colors-accent)",
            },
          },
        },
      },
    },
    Select: {
      variants: {
        outline: {
          field: {
            bg: "surface",
            borderColor: "line",
            borderRadius: "4px",
            _focusVisible: {
              borderColor: "accent",
              boxShadow: "0 0 0 1px var(--chakra-colors-accent)",
            },
          },
        },
      },
    },
    Textarea: {
      variants: {
        outline: {
          bg: "surface",
          borderColor: "line",
          borderRadius: "4px",
          _focusVisible: {
            borderColor: "accent",
            boxShadow: "0 0 0 1px var(--chakra-colors-accent)",
          },
        },
      },
    },
    FormLabel: { baseStyle: { fontSize: "xs", color: "mute", mb: 1 } },
    Table: {
      variants: {
        ledger: {
          th: {
            fontFamily: "mono",
            fontSize: "10px",
            letterSpacing: ".08em",
            color: "mute",
            borderBottom: "2px solid",
            borderColor: "ink",
            px: 3,
            py: 2,
          },
          td: {
            borderBottom: "1px solid",
            borderColor: "line",
            px: 3,
            py: 2.5,
            fontSize: "sm",
          },
        },
      },
      defaultProps: { variant: "ledger" },
    },
    Modal: {
      baseStyle: {
        dialog: {
          bg: "surface",
          borderRadius: "6px",
          border: "1px solid",
          borderColor: "ink",
        },
      },
    },
    Drawer: { baseStyle: { dialog: { bg: "side", color: "#e9e4d3" } } },
    Menu: {
      baseStyle: {
        list: { bg: "surface", borderColor: "ink", borderRadius: "6px" },
        item: { bg: "surface", _hover: { bg: "bg" }, _focus: { bg: "bg" } },
      },
    },
    Popover: { baseStyle: { content: { bg: "surface", borderColor: "ink" } } },
    Tabs: {
      variants: {
        line: {
          tab: {
            fontWeight: 600,
            color: "mute",
            _selected: { color: "ink", borderColor: "accent" },
          },
          tablist: { borderColor: "line" },
        },
      },
    },
    Tag: {
      baseStyle: {
        container: { fontFamily: "mono", fontSize: "11px", fontWeight: 600 },
      },
    },
  },
});

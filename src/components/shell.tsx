"use client";
import { useEffect, useState } from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  HStack,
  IconButton,
  Input,
  Kbd,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Modal,
  ModalContent,
  ModalOverlay,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useColorMode,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import {
  Bell,
  ChevronsUpDown,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  Wallet,
  Activity,
  BarChart3,
  Waves,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { markRead, switchWorkspace } from "@/app/actions";
import { ago } from "@/lib/dates";

type Note = {
  id: string;
  title: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};
type Props = {
  user: { name: string; email: string };
  ws: { name: string };
  workspaces: { id: string; name: string }[];
  role: string;
  canFinance: boolean;
  notes: Note[];
  unread: number;
  children: React.ReactNode;
};

const NAV = (fin: boolean) =>
  [
    { href: "/overview", label: "Overview", icon: LayoutDashboard },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/tasks", label: "Tasks", icon: ListChecks },
    ...(fin
      ? [
          { href: "/invoices", label: "Invoices", icon: FileText },
          { href: "/payments", label: "Payments", icon: Wallet },
          { href: "/reports", label: "Reports", icon: BarChart3 },
        ]
      : []),
    { section: "Workspace" },
    { href: "/team", label: "Team", icon: ShieldCheck },
    { href: "/activity", label: "Activity", icon: Activity },
    { href: "/settings", label: "Settings", icon: Settings },
  ] as any[];

function Nav({ fin, onNav }: { fin: boolean; onNav?: () => void }) {
  const path = usePathname();
  return (
    <VStack align="stretch" spacing={0.5}>
      {NAV(fin).map((n, i) =>
        n.section ? (
          <Text
            key={i}
            fontFamily="mono"
            fontSize="10px"
            letterSpacing=".1em"
            textTransform="uppercase"
            color="#7f9486"
            px={3}
            pt={5}
            pb={1}
          >
            {n.section}
          </Text>
        ) : (
          <Flex
            key={n.href}
            as={NextLink}
            href={n.href}
            onClick={onNav}
            align="center"
            gap={3}
            px={3}
            py={2}
            borderRadius="5px"
            color={path.startsWith(n.href) ? "white" : "#b5c4b9"}
            bg={path.startsWith(n.href) ? "#ffffff1c" : "transparent"}
            fontWeight={path.startsWith(n.href) ? 700 : 500}
            boxShadow={
              path.startsWith(n.href)
                ? "inset 3px 0 var(--chakra-colors-accent)"
                : undefined
            }
            transition="all .15s"
            _hover={{ color: "white", bg: "#ffffff12" }}
          >
            <n.icon size={16} />
            {n.label}
          </Flex>
        ),
      )}
    </VStack>
  );
}

function Palette({
  isOpen,
  onClose,
  fin,
}: {
  isOpen: boolean;
  onClose: () => void;
  fin: boolean;
}) {
  const r = useRouter();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<any[]>([]);
  const [i, setI] = useState(0);
  const [recent, setRecent] = useState<any[]>([]);
  useEffect(() => {
    if (isOpen) {
      setQ("");
      setRes([]);
      setI(0);
      try {
        setRecent(JSON.parse(localStorage.getItem("fd_recent") || "[]"));
      } catch {
        setRecent([]);
      }
    }
  }, [isOpen]);
  useEffect(() => {
    if (q.trim().length < 2) {
      setRes([]);
      return;
    }
    const t = setTimeout(async () => {
      const x = await fetch("/api/search?q=" + encodeURIComponent(q));
      if (x.ok) setRes(await x.json());
    }, 180);
    return () => clearTimeout(t);
  }, [q]);
  const pages = [
    ...NAV(fin)
      .filter((n) => n.href)
      .map((n) => ({ label: n.label, sub: "Go to page", href: n.href })),
    { label: "New customer", sub: "Quick action", href: "/customers?new=1" },
    { label: "New project", sub: "Quick action", href: "/projects?new=1" },
    { label: "New task", sub: "Quick action", href: "/tasks?new=1" },
    ...(fin
      ? [{ label: "New invoice", sub: "Quick action", href: "/invoices/new" }]
      : []),
  ];
  const list =
    q.trim().length < 2
      ? [
          ...recent.map((x) => ({
            label: x.title,
            sub: "Recent · " + x.kind,
            href: x.href,
          })),
          ...pages,
        ]
      : [
          ...pages.filter((p) =>
            p.label.toLowerCase().includes(q.toLowerCase()),
          ),
          ...res.map((x) => ({
            label: x.title,
            sub: x.kind + (x.sub ? " · " + x.sub : ""),
            href: x.href,
          })),
        ];
  const go = (h: string) => {
    onClose();
    r.push(h);
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent mt="12vh" mx={3}>
        <Input
          autoFocus
          variant="flushed"
          px={4}
          h={14}
          placeholder="Search customers, projects, tasks, invoices… or jump to a page"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setI(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setI((x) => Math.min(x + 1, list.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setI((x) => Math.max(x - 1, 0));
            } else if (e.key === "Enter" && list[i]) go(list[i].href);
          }}
        />
        <Box maxH="50vh" overflowY="auto" p={2}>
          {list.slice(0, 12).map((x, n) => (
            <Flex
              key={x.href + x.label + n}
              px={3}
              py={2}
              borderRadius="4px"
              justify="space-between"
              cursor="pointer"
              bg={n === i ? "bg" : undefined}
              onMouseEnter={() => setI(n)}
              onClick={() => go(x.href)}
            >
              <Text fontWeight={600}>{x.label}</Text>
              <Text color="mute" fontSize="sm">
                {x.sub}
              </Text>
            </Flex>
          ))}
          {!list.length && (
            <Text color="mute" p={4}>
              No results
            </Text>
          )}
        </Box>
      </ModalContent>
    </Modal>
  );
}

function Bell_({ notes, unread }: { notes: Note[]; unread: number }) {
  const r = useRouter();
  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <Box position="relative">
          <IconButton
            aria-label="Notifications"
            variant="outline"
            size="sm"
            icon={<Bell size={16} />}
          />
          {unread > 0 && (
            <Badge
              position="absolute"
              top="-6px"
              right="-6px"
              bg="accent"
              color="white"
              borderRadius="full"
              fontSize="10px"
            >
              {unread}
            </Badge>
          )}
        </Box>
      </PopoverTrigger>
      <PopoverContent w="320px">
        <PopoverBody p={2}>
          <Flex justify="space-between" px={2} py={1}>
            <Text fontWeight={700}>Notifications</Text>
            {unread > 0 && (
              <Button size="xs" variant="ghost" onClick={() => markRead()}>
                Mark all as read
              </Button>
            )}
          </Flex>
          {notes.length === 0 && (
            <Text color="mute" p={3} fontSize="sm">
              You are all caught up.
            </Text>
          )}
          {notes.map((n) => (
            <Box
              key={n.id}
              px={2}
              py={2}
              borderRadius="4px"
              cursor="pointer"
              borderLeft="3px solid"
              borderColor={n.read_at ? "transparent" : "accent"}
              _hover={{ bg: "bg" }}
              onClick={() => {
                void markRead(n.id);
                if (n.href) r.push(n.href);
              }}
            >
              <Text fontSize="sm" fontWeight={n.read_at ? 400 : 600}>
                {n.title}
              </Text>
              <Text fontSize="xs" color="mute">
                {ago(n.created_at)}
              </Text>
            </Box>
          ))}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

export function Shell({
  user,
  ws,
  workspaces,
  role,
  canFinance,
  notes,
  unread,
  children,
}: Props) {
  const path = usePathname();
  const r = useRouter();
  const drawer = useDisclosure();
  const pal = useDisclosure();
  const qc = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing =
        /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        pal.onOpen();
      } else if (!typing && !e.metaKey && !e.ctrlKey && e.key === "/") {
        e.preventDefault();
        pal.onOpen();
      } else if (
        !typing &&
        !e.metaKey &&
        !e.ctrlKey &&
        e.key.toLowerCase() === "n"
      ) {
        e.preventDefault();
        qc.onOpen();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []); // eslint-disable-line
  const crumb = path
    .split("/")
    .filter(Boolean)
    .map((s) => (s.length > 20 ? "Details" : s))
    .join(" / ");
  const quick = [
    ["Customer", "/customers?new=1"],
    ["Project", "/projects?new=1"],
    ["Task", "/tasks?new=1"],
    ...(canFinance ? [["Invoice", "/invoices/new"]] : []),
  ];
  return (
    <Flex minH="100vh">
      <Box
        as="aside"
        display={{ base: "none", lg: "flex" }}
        flexDir="column"
        w="236px"
        bg="side"
        color="#e9e4d3"
        position="sticky"
        top={0}
        h="100vh"
        p={3}
        className="no-print"
        flexShrink={0}
      >
        <SideTop ws={ws.name} workspaces={workspaces} />
        <Nav fin={canFinance} />
        <Box flex={1} />
        <Text fontFamily="mono" fontSize="10px" color="#7f9486" px={3} pb={2}>
          YOU ARE {role.toUpperCase()}
        </Text>
      </Box>
      <Drawer isOpen={drawer.isOpen} onClose={drawer.onClose} placement="left">
        <DrawerOverlay />
        <DrawerContent maxW="260px">
          <DrawerBody p={3}>
            <SideTop ws={ws.name} workspaces={workspaces} />
            <Nav fin={canFinance} onNav={drawer.onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      <Box flex={1} minW={0}>
        <Flex
          as="header"
          className="no-print"
          position="sticky"
          top={0}
          zIndex={10}
          align="center"
          gap={2}
          px={{ base: 3, lg: 7 }}
          py={2.5}
          bg="bg"
          borderBottom="1px solid"
          borderColor="line"
          opacity={0.97}
          sx={{ backdropFilter: "blur(6px)" }}
        >
          <IconButton
            display={{ lg: "none" }}
            aria-label="Open navigation"
            variant="outline"
            size="sm"
            icon={<MenuIcon size={16} />}
            onClick={drawer.onOpen}
          />
          <Text
            flex={1}
            fontFamily="mono"
            fontSize="12px"
            color="mute"
            textTransform="capitalize"
            noOfLines={1}
          >
            {crumb}
          </Text>
          <Button
            variant="outline"
            size="sm"
            onClick={pal.onOpen}
            leftIcon={<Search size={14} />}
            rightIcon={<Kbd display={{ base: "none", md: "inline" }}>⌘K</Kbd>}
            fontWeight={400}
            color="mute"
            minW={{ md: "200px" }}
            justifyContent="space-between"
          >
            <Text display={{ base: "none", md: "inline" }}>Search</Text>
          </Button>
          <Menu isOpen={qc.isOpen} onOpen={qc.onOpen} onClose={qc.onClose}>
            <MenuButton as={Button} size="sm" leftIcon={<Plus size={14} />}>
              New
            </MenuButton>
            <MenuList>
              {quick.map(([l, h]) => (
                <MenuItem key={h} onClick={() => r.push(h)}>
                  {l}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
          <Bell_ notes={notes} unread={unread} />
          <IconButton
            aria-label="Toggle colour mode"
            variant="outline"
            size="sm"
            icon={colorMode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            onClick={toggleColorMode}
          />
          <Menu>
            <MenuButton>
              <Avatar name={user.name} size="sm" bg="side" color="#e9e4d3" />
            </MenuButton>
            <MenuList>
              <Box px={3} py={2}>
                <Text fontWeight={700}>{user.name}</Text>
                <Text fontSize="xs" color="mute">
                  {user.email}
                </Text>
              </Box>
              <MenuDivider />
              <MenuItem
                icon={<Settings size={14} />}
                onClick={() => r.push("/settings")}
              >
                Settings
              </MenuItem>
              <MenuItem
                icon={<LogOut size={14} />}
                onClick={async () => {
                  await authClient.signOut();
                  window.location.href = "/login";
                }}
              >
                Sign out
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
        <Box as="main" px={{ base: 3, lg: 7 }} py={6} maxW="1200px">
          {children}
        </Box>
      </Box>
      <Palette isOpen={pal.isOpen} onClose={pal.onClose} fin={canFinance} />
    </Flex>
  );
}

function SideTop({
  ws,
  workspaces,
}: {
  ws: string;
  workspaces: { id: string; name: string }[];
}) {
  return (
    <>
      <Flex
        align="center"
        gap={2}
        px={3}
        pt={1}
        pb={3}
        fontFamily="heading"
        fontSize="26px"
      >
        <Box color="accent">
          <Waves size={22} />
        </Box>
        FlowDesk
      </Flex>
      <Menu>
        <MenuButton
          as={Button}
          variant="outline"
          mb={3}
          mx={1}
          size="sm"
          borderColor="#ffffff2a"
          color="#e9e4d3"
          justifyContent="space-between"
          rightIcon={<ChevronsUpDown size={14} />}
          _hover={{ bg: "#ffffff12", color: "white" }}
          textAlign="left"
          h={10}
        >
          <Text noOfLines={1}>{ws}</Text>
        </MenuButton>
        <MenuList color="ink">
          {workspaces.map((w) => (
            <MenuItem key={w.id} onClick={() => switchWorkspace(w.id)}>
              {w.name}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
    </>
  );
}
export function TrackRecent({
  title,
  href,
  kind,
}: {
  title: string;
  href: string;
  kind: string;
}) {
  useEffect(() => {
    try {
      const l = JSON.parse(localStorage.getItem("fd_recent") || "[]").filter(
        (x: any) => x.href !== href,
      );
      localStorage.setItem(
        "fd_recent",
        JSON.stringify([{ title, href, kind }, ...l].slice(0, 5)),
      );
    } catch {}
  }, [title, href, kind]);
  return null;
}

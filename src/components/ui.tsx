"use client";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Flex,
  Heading,
  Tag,
  Text,
  Tr,
  Avatar as CAvatar,
  Link as CLink,
  type ButtonProps,
} from "@chakra-ui/react";
import { LABEL } from "@/lib/constants";

// Client-boundary re-exports: server pages compose layout with these, interactivity lives in dedicated client components.
export {
  ChakraProvider,
  ColorModeScript,
  Box,
  Flex,
  Stack,
  HStack,
  VStack,
  Text,
  Heading,
  SimpleGrid,
  Grid,
  GridItem,
  Spacer,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Progress,
  Tag,
  Badge,
  Alert,
  AlertIcon,
  Kbd,
  Skeleton,
  Tooltip,
} from "@chakra-ui/react";

export const LinkButton = ({
  href,
  children,
  ...p
}: { href: string } & ButtonProps) => (
  <Button as={NextLink} href={href} {...p}>
    {children}
  </Button>
);
export const TextLink = ({
  href,
  children,
  ...p
}: { href: string; children: React.ReactNode } & Record<string, any>) => (
  <CLink as={NextLink} href={href} color="accent" fontWeight={600} {...p}>
    {children}
  </CLink>
);
export const RowLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => {
  const r = useRouter();
  return (
    <Tr
      cursor="pointer"
      _hover={{ bg: "rule" }}
      onClick={() => r.push(href)}
      onMouseEnter={() => r.prefetch(href)}
    >
      {children}
    </Tr>
  );
};

const TONE: Record<string, string> = {
  paid: "ok",
  completed: "ok",
  done: "ok",
  active: "ok",
  low: "ok",
  overdue: "danger",
  urgent: "danger",
  void: "danger",
  sent: "info",
  in_progress: "info",
  medium: "info",
  pending: "info",
  in_review: "warn",
  partially_paid: "warn",
  on_hold: "warn",
  high: "warn",
  draft: "mute",
  planning: "mute",
  inactive: "mute",
  lead: "mute",
  todo: "mute",
  owner: "accent",
  admin: "info",
  member: "mute",
  viewer: "mute",
};
export function Status({ value }: { value: string }) {
  const c = TONE[value] ?? "mute";
  return (
    <Tag
      size="sm"
      variant="outline"
      color={c}
      boxShadow={`inset 0 0 0 1px currentColor`}
      borderRadius="full"
      whiteSpace="nowrap"
    >
      {LABEL[value] ?? value}
    </Tag>
  );
}
export const Avatar = ({
  name,
  size = "xs",
}: {
  name: string;
  size?: string;
}) => (
  <CAvatar name={name} size={size} bg="side" color="#e9e4d3" title={name} />
);

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Flex
      justify="space-between"
      align="flex-start"
      gap={4}
      wrap="wrap"
      mb={5}
      className="no-print-actions"
    >
      <Box>
        <Heading as="h1" size="2xl" lineHeight="1.05">
          {title}
        </Heading>
        {sub && (
          <Text color="mute" mt={1}>
            {sub}
          </Text>
        )}
      </Box>
      {actions && (
        <Flex gap={2} wrap="wrap" className="no-print">
          {actions}
        </Flex>
      )}
    </Flex>
  );
}
export const Card = ({
  children,
  title,
  action,
  ...p
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
} & Record<string, any>) => (
  <Box
    bg="surface"
    borderWidth="1px"
    borderColor="line"
    borderRadius="6px"
    p={5}
    mb={4}
    {...p}
  >
    {(title || action) && (
      <Flex justify="space-between" align="center" mb={3}>
        {title && (
          <Text
            fontFamily="mono"
            fontSize="11px"
            letterSpacing=".08em"
            textTransform="uppercase"
            color="mute"
            fontWeight={700}
          >
            {title}
          </Text>
        )}
        {action}
      </Flex>
    )}
    {children}
  </Box>
);
export function StatStrip({
  stats,
}: {
  stats: { label: string; value: React.ReactNode; sub?: React.ReactNode }[];
}) {
  return (
    <Flex
      bg="surface"
      borderWidth="1px"
      borderColor="line"
      borderRadius="6px"
      mb={4}
      direction={{ base: "column", md: "row" }}
      sx={{
        "& > *:not(:last-child)": {
          borderRightWidth: { base: 0, md: "1px" },
          borderBottomWidth: { base: "1px", md: 0 },
          borderColor: "line",
        },
      }}
    >
      {stats.map((s) => (
        <Box key={s.label} flex={1} p={4} px={5} className="stat-in">
          <Text
            fontFamily="mono"
            fontSize="10px"
            letterSpacing=".08em"
            color="mute"
            textTransform="uppercase"
          >
            {s.label}
          </Text>
          <Text fontFamily="heading" fontSize="3xl" lineHeight="1.15">
            {s.value}
          </Text>
          {s.sub && (
            <Text fontFamily="mono" fontSize="11px" color="mute">
              {s.sub}
            </Text>
          )}
        </Box>
      ))}
    </Flex>
  );
}
export const EmptyState = ({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) => (
  <Box textAlign="center" py={10} px={4}>
    <Heading size="md" mb={1}>
      {title}
    </Heading>
    <Text color="mute" mb={action ? 4 : 0}>
      {text}
    </Text>
    {action}
  </Box>
);
export const ExportButton = ({
  href,
  label = "Export CSV",
}: {
  href: string;
  label?: string;
}) => (
  <Button as="a" href={href} download variant="outline" size="sm">
    {label}
  </Button>
);

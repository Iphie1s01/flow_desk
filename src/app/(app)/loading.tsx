import { Skeleton, Stack, Flex } from "@chakra-ui/react";
export default function Loading() {
  return (
    <Stack spacing={4}>
      <Skeleton h="48px" w="320px" />
      <Flex gap={4}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} h="90px" flex={1} />
        ))}
      </Flex>
      <Skeleton h="260px" />
    </Stack>
  );
}

"use client";
import { Box, Button, Heading, Text } from "@chakra-ui/react";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <Box textAlign="center" py={16}>
      <Heading size="lg" mb={2}>
        We couldn’t load this page.
      </Heading>
      <Text color="mute" mb={4}>
        Check your connection and try again.
      </Text>
      <Button onClick={reset}>Retry</Button>
    </Box>
  );
}

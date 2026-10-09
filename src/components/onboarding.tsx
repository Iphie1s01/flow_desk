"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Input,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Wrap,
} from "@chakra-ui/react";
import { completeOnboarding } from "@/app/actions";
import { BUSINESS_TYPES, CURRENCIES, GOALS } from "@/lib/constants";

export function Onboarding({ name }: { name: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [v, setV] = useState<Record<string, any>>({
    fullName: name,
    avatarUrl: "",
    wsName: "",
    businessType: BUSINESS_TYPES[0],
    currency: "NGN",
    goals: ["clients", "projects"],
    customerName: "",
    projectName: "",
    taskTitle: "",
  });
  const set = (k: string, x: any) => {
    setV((p) => ({ ...p, [k]: x }));
    setErr((p) => ({ ...p, [k]: "" }));
  };
  const titles = [
    "About you",
    "Your workspace",
    "What do you want to do?",
    "Try it out",
  ];
  const next = () => {
    if (step === 0 && !v.fullName.trim())
      return setErr({ fullName: "Your name is required." });
    if (step === 1 && !v.wsName.trim())
      return setErr({ wsName: "Business name is required." });
    setStep(step + 1);
  };
  async function finish(skip = false) {
    setBusy(true);
    setMsg("");
    const r = await completeOnboarding(
      skip ? { ...v, customerName: "", projectName: "", taskTitle: "" } : v,
    );
    setBusy(false);
    if (!r.ok) {
      setMsg(r.error);
      setErr(r.fields ?? {});
      if (r.fields?.fullName) setStep(0);
      else if (r.fields?.wsName) setStep(1);
      return;
    }
    router.push("/overview");
    router.refresh();
  }
  return (
    <Flex minH="100vh" align="center" justify="center" p={4}>
      <Box w="full" maxW="520px">
        <Text
          fontFamily="mono"
          fontSize="11px"
          letterSpacing=".1em"
          color="accent"
          mb={2}
        >
          STEP {step + 1} OF 4
        </Text>
        <Progress
          value={((step + 1) / 4) * 100}
          size="xs"
          colorScheme="orange"
          bg="line"
          borderRadius="full"
          mb={4}
        />
        <Heading size="xl" mb={4}>
          {titles[step]}
        </Heading>
        <Box
          bg="surface"
          border="1px solid"
          borderColor="line"
          borderRadius="6px"
          p={5}
        >
          <Stack spacing={4}>
            {step === 0 && (
              <>
                <FormControl isInvalid={!!err.fullName} isRequired>
                  <FormLabel>Your name</FormLabel>
                  <Input
                    value={v.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                  />
                  <FormErrorMessage>{err.fullName}</FormErrorMessage>
                </FormControl>
                <FormControl>
                  <FormLabel>Profile image URL (optional)</FormLabel>
                  <Input
                    type="url"
                    placeholder="https://…"
                    value={v.avatarUrl}
                    onChange={(e) => set("avatarUrl", e.target.value)}
                  />
                </FormControl>
              </>
            )}
            {step === 1 && (
              <>
                <FormControl isInvalid={!!err.wsName} isRequired>
                  <FormLabel>Business name</FormLabel>
                  <Input
                    value={v.wsName}
                    onChange={(e) => set("wsName", e.target.value)}
                  />
                  <FormErrorMessage>{err.wsName}</FormErrorMessage>
                </FormControl>
                <SimpleGrid columns={2} spacing={3}>
                  <FormControl>
                    <FormLabel>Business type</FormLabel>
                    <Select
                      value={v.businessType}
                      onChange={(e) => set("businessType", e.target.value)}
                    >
                      {BUSINESS_TYPES.map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Currency</FormLabel>
                    <Select
                      value={v.currency}
                      onChange={(e) => set("currency", e.target.value)}
                    >
                      {CURRENCIES.map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </Select>
                  </FormControl>
                </SimpleGrid>
              </>
            )}
            {step === 2 && (
              <CheckboxGroup value={v.goals} onChange={(x) => set("goals", x)}>
                <Wrap spacing={5}>
                  {GOALS.map(([k, l]) => (
                    <Checkbox key={k} value={k} colorScheme="orange">
                      {l}
                    </Checkbox>
                  ))}
                </Wrap>
              </CheckboxGroup>
            )}
            {step === 3 && (
              <>
                <Text color="mute" fontSize="sm">
                  Optional. Add a first customer, project and task, or skip and
                  explore on your own.
                </Text>
                <FormControl>
                  <FormLabel>First customer</FormLabel>
                  <Input
                    value={v.customerName}
                    onChange={(e) => set("customerName", e.target.value)}
                  />
                </FormControl>
                <FormControl isDisabled={!v.customerName.trim()}>
                  <FormLabel>First project</FormLabel>
                  <Input
                    value={v.projectName}
                    onChange={(e) => set("projectName", e.target.value)}
                  />
                </FormControl>
                <FormControl isDisabled={!v.projectName.trim()}>
                  <FormLabel>First task</FormLabel>
                  <Input
                    value={v.taskTitle}
                    onChange={(e) => set("taskTitle", e.target.value)}
                  />
                </FormControl>
              </>
            )}
            {msg && (
              <Alert status="error" borderRadius="4px">
                <AlertIcon />
                {msg}
              </Alert>
            )}
            <Flex justify="space-between">
              <Button
                variant="ghost"
                isDisabled={step === 0}
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
              {step < 3 ? (
                <Button onClick={next}>Continue</Button>
              ) : (
                <Flex gap={2}>
                  <Button
                    variant="outline"
                    isLoading={busy}
                    onClick={() => finish(true)}
                  >
                    Skip
                  </Button>
                  <Button isLoading={busy} onClick={() => finish()}>
                    Finish
                  </Button>
                </Flex>
              )}
            </Flex>
          </Stack>
        </Box>
      </Box>
    </Flex>
  );
}

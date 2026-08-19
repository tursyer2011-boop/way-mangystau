import emailjs from "@emailjs/browser";

const SERVICE_ID = "service_699r90f";
const TEMPLATE_ID = "template_rypwtvb";
const PUBLIC_KEY = "r8yTg3mPCXFSP3rl5";

export function generatePasscode() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0]! % 1000000).padStart(6, "0");
}

/** Sends the verification passcode to the user's email via EmailJS. */
export async function sendPasscodeEmail(email: string, passcode: string, expiresAt: Date) {
  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      email,
      passcode,
      time: expiresAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    },
    { publicKey: PUBLIC_KEY },
  );
}

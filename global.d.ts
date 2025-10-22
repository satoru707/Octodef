declare module "virustotal-api" {
  import { VirusTotal } from "virustotal-api";
  export default VirusTotal;
}

declare module "malicious-link-detector" {
  import { MaliciousLinkDetector } from "malicious-link-detector";
  export default MaliciousLinkDetector;
}

declare module "spamscanner" {
  import { SpamScanner } from "spamscanner";
  export default SpamScanner;
}

declare module "input-otp" {
  import { InputOTP } from "input-otp";
  export default InputOTP;
}

declare module "geoip-country-lite" {
  const country: (ip: string) => string | null;
  export default country;
}
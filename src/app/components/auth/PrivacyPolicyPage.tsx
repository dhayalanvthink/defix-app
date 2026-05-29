import React from 'react';
import { LegalLayout } from './LegalLayout';

export function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="February 18, 2026">
      <h2>1. Introduction</h2>
      <p>
        At Defix ("we," "our," or "us"), we take your privacy seriously. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our image annotation platform ("the Service"). By using the Service, you consent to the practices described in this policy.
      </p>

      <h2>2. Information We Collect</h2>
      <h3>2.1 Account Information</h3>
      <p>
        When you create an account, we collect the information you provide, which may include:
      </p>
      <ul>
        <li><strong>Email address</strong> — used for account identification, authentication, and communication.</li>
        <li><strong>Name</strong> — used for display purposes within the Service.</li>
        <li><strong>Password</strong> — stored in a securely hashed format; we never store or have access to your plaintext password.</li>
        <li><strong>Profile avatar</strong> — if provided via third-party authentication (e.g., Google).</li>
      </ul>

      <h3>2.2 User Content</h3>
      <p>
        We store the images you upload, the annotations you create, and associated metadata (such as timestamps and canvas dimensions) in order to provide the Service. This content remains under your ownership at all times.
      </p>

      <h3>2.3 Usage Data</h3>
      <p>
        We may automatically collect certain technical information when you use the Service, including:
      </p>
      <ul>
        <li>Browser type and version</li>
        <li>Device type and screen resolution</li>
        <li>IP address (anonymized where possible)</li>
        <li>Pages visited and features used within the Service</li>
        <li>Timestamps of access</li>
      </ul>

      <h3>2.4 Cookies &amp; Local Storage</h3>
      <p>
        The Service uses cookies and browser local storage to maintain your authentication session and user preferences. These are essential for the Service to function properly and are not used for advertising or tracking purposes.
      </p>

      <h2>3. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, operate, and maintain the Service.</li>
        <li>Authenticate your identity and secure your account.</li>
        <li>Store and retrieve your images and annotations.</li>
        <li>Generate shareable links for your annotated content when requested.</li>
        <li>Send essential communications such as password reset emails and account confirmation.</li>
        <li>Improve the Service by understanding usage patterns and fixing issues.</li>
        <li>Ensure the security and integrity of the Service.</li>
      </ul>

      <h2>4. Data Sharing &amp; Disclosure</h2>
      <p>
        We do <strong>not</strong> sell, rent, or trade your personal information to third parties. We may share your information only in the following circumstances:
      </p>
      <ul>
        <li><strong>Service providers</strong> — We use trusted third-party services (e.g., Supabase for authentication, database, and storage) that process data on our behalf under strict data protection agreements.</li>
        <li><strong>Shared content</strong> — When you create a shareable link, the annotated image associated with that link becomes viewable by anyone with the link. No personal account information is exposed through shared links.</li>
        <li><strong>Legal requirements</strong> — We may disclose your information if required to do so by law, regulation, or legal process, or if we believe in good faith that disclosure is necessary to protect our rights, your safety, or the safety of others.</li>
      </ul>

      <h2>5. Data Storage &amp; Security</h2>
      <p>
        Your data is stored using industry-standard cloud infrastructure provided by Supabase. We implement appropriate technical and organizational measures to protect your personal information, including:
      </p>
      <ul>
        <li>Encryption of data in transit (TLS/SSL).</li>
        <li>Secure hashing of passwords using modern algorithms.</li>
        <li>Row-level security policies on database tables.</li>
        <li>Access controls limiting internal access to user data.</li>
      </ul>
      <p>
        While we strive to protect your information, no method of electronic storage or transmission is 100% secure. We cannot guarantee absolute security.
      </p>

      <h2>6. Data Retention</h2>
      <p>
        We retain your personal information and User Content for as long as your account is active or as needed to provide the Service. If you delete your account, we will remove your personal data and User Content within a reasonable timeframe, except where retention is required by law or for legitimate business purposes (e.g., resolving disputes).
      </p>

      <h2>7. Your Rights</h2>
      <p>Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
      <ul>
        <li><strong>Access</strong> — Request a copy of the personal data we hold about you.</li>
        <li><strong>Correction</strong> — Request correction of inaccurate or incomplete data.</li>
        <li><strong>Deletion</strong> — Request deletion of your personal data and account.</li>
        <li><strong>Portability</strong> — Request your data in a portable, machine-readable format.</li>
        <li><strong>Objection</strong> — Object to certain processing of your personal data.</li>
      </ul>
      <p>
        To exercise any of these rights, please contact us through the channels provided within the Service. We will respond to your request within a reasonable timeframe.
      </p>

      <h2>8. Third-Party Authentication</h2>
      <p>
        If you choose to sign in using a third-party provider (e.g., Google), we receive limited profile information from that provider (such as your name, email, and avatar). We do not have access to your third-party account password. Your use of third-party sign-in is also subject to that provider's privacy policy.
      </p>

      <h2>9. Children's Privacy</h2>
      <p>
        The Service is not intended for children under the age of 13 (or the applicable age of digital consent in your jurisdiction). We do not knowingly collect personal information from children. If we become aware that we have collected data from a child, we will take steps to delete it promptly.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, regulatory, or operational reasons. We will notify you of significant changes by posting the updated policy within the Service with a revised "Last updated" date. We encourage you to review this policy periodically.
      </p>

      <h2>11. Contact</h2>
      <p>
        If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us through the channels provided within the Service.
      </p>
    </LegalLayout>
  );
}

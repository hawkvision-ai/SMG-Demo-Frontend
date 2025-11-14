export function TermsAndConditions() {
  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="border-gray-200 bg-gray-50 px-2 py-4">
        <div className="max-w-auto mx-auto flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Terms & Conditions</h1>
        </div>
      </div>

      {/* Scrollable Container */}
      <div className="h-[calc(100vh-190px)] overflow-y-auto">
        {/* Content */}
        <div className="max-w-auto mx-auto px-12 py-4">
          <div className="rounded-lg border-gray-200">
            {/* Section 1: Introduction */}
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">1. Introduction</h2>
              <p className="mb-4 leading-relaxed text-gray-700">
                We value your privacy and are committed to protecting your personal information.
                These Data Privacy Terms and Conditions ("Terms") explain how we collect, use,
                store, and safeguard your personal data when you interact with our services,
                website, or applications.
              </p>
              <p className="leading-relaxed text-gray-700">
                By using our services, you consent to the practices described in these Terms.
              </p>
            </section>

            {/* Section 2: Information We Collect */}
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                2. Information We Collect
              </h2>
              <p className="mb-3 leading-relaxed text-gray-700">
                We may collect the following types of information:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-gray-700">
                <li>
                  <span className="font-semibold">Technical Information:</span> IP address, device
                  type, browser, operating system, cookies.
                </li>
                <li>
                  <span className="font-semibold">Usage Data:</span> interactions with our website,
                  services, or applications.
                </li>
                <li>
                  <span className="font-semibold">Other Information:</span> provided voluntarily by
                  you (e.g., survey responses, inquiries).
                </li>
              </ul>
            </section>

            {/* Section 3: How We Use Your Information */}
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                3. How We Use Your Information
              </h2>
              <p className="mb-3 leading-relaxed text-gray-700">
                We process personal data only when lawful and necessary, including:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-gray-700">
                <li>To provide and improve our services.</li>
                <li>
                  To communicate with you (customer support, updates, marketing if consented).
                </li>
                <li>To comply with legal or regulatory requirements.</li>
                <li>To prevent fraud, security threats, or misuse of our services.</li>
              </ul>
            </section>

            {/* Section 4: Legal Basis for Processing */}
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                4. Legal Basis for Processing (where applicable, e.g., GDPR/POPIA/DPDP)
              </h2>
              <p className="mb-3 leading-relaxed text-gray-700">
                We process your personal information under one or more of the following legal bases:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-gray-700">
                <li>
                  <span className="font-semibold">Consent</span> (where you have given clear
                  permission).
                </li>
                <li>
                  <span className="font-semibold">Contractual Necessity</span> (to provide requested
                  services).
                </li>
                <li>
                  <span className="font-semibold">Legal Obligation</span> (to comply with applicable
                  laws).
                </li>
                <li>
                  <span className="font-semibold">Legitimate Interest</span> (where it does not
                  override your rights).
                </li>
              </ul>
            </section>

            {/* Section 5: Data Sharing and Disclosure */}
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                5. Data Sharing and Disclosure
              </h2>
              <p className="mb-3 leading-relaxed text-gray-700">
                We do not sell your personal data. However, we may share it with:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-gray-700">
                <li>Trusted service providers assisting in delivering our services.</li>
                <li>Legal or regulatory authorities when required by law.</li>
                <li>Business partners in case of mergers, acquisitions, or restructuring.</li>
              </ul>
            </section>

            {/* Section 6: Data Retention */}
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">6. Data Retention</h2>
              <p className="leading-relaxed text-gray-700">
                We retain your personal data only as long as necessary for the purposes outlined in
                these Terms, or as required by law. When no longer needed, data will be securely
                deleted or anonymized.
              </p>
            </section>

            {/* Section 7: Data Security */}
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">7. Data Security</h2>
              <p className="leading-relaxed text-gray-700">
                We implement reasonable technical, organizational, and administrative safeguards to
                protect personal data against unauthorized access, loss, misuse, or disclosure.
              </p>
            </section>

            {/* Section 8: International Data Transfers */}
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                8. International Data Transfers
              </h2>
              <p className="leading-relaxed text-gray-700">
                If your information is transferred outside your country, we will ensure appropriate
                safeguards (e.g., contractual clauses, adequacy decisions) are in place as required
                by law.
              </p>
            </section>

            {/* Section 9: Your Rights */}
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">9. Your Rights</h2>
              <p className="mb-3 leading-relaxed text-gray-700">
                Depending on applicable law (e.g., GDPR, POPIA, DPDP), you may have the right to:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-gray-700">
                <li>Access and request a copy of your data.</li>
                <li>Correct or update inaccurate information.</li>
                <li>Request deletion of your data ("right to be forgotten").</li>
                <li>Object to or restrict certain processing activities.</li>
                <li>Withdraw consent where processing is based on consent.</li>
                <li>Lodge a complaint with the relevant supervisory authority.</li>
              </ul>
            </section>

            {/* Section 10: Cookies and Tracking Technologies */}
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                10. Cookies and Tracking Technologies
              </h2>
              <p className="leading-relaxed text-gray-700">
                We may use cookies, beacons, and similar technologies to enhance user experience,
                analyze site traffic, and personalize content. You can manage cookie preferences
                through your browser settings.
              </p>
            </section>

            {/* Section 11: Updates to These Terms */}
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                11. Updates to These Terms
              </h2>
              <p className="leading-relaxed text-gray-700">
                We may update these Terms from time to time. Any significant changes will be
                communicated via our website or other appropriate means. Continued use of our
                services after updates constitutes acceptance.
              </p>
            </section>

            {/* Section 12: Contact Us */}
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">12. Contact Us</h2>
              <p className="mb-4 leading-relaxed text-gray-700">
                If you have questions, requests, or complaints regarding these Terms or our privacy
                practices, please contact us at:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-gray-700">
                <li>
                  <span className="font-semibold">HawkVision AI Limited</span>
                </li>
                <li>
                  <span className="font-semibold">Email:</span> data.protection@hawkvision.ai
                </li>
                <li>
                  <span className="font-semibold">Address:</span> 3rd Floor, 86-90 Paul Street,
                  London, England, United Kingdom, EC2A 4NE
                </li>
              </ul>
            </section>

            {/* Footer Note */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <p className="text-sm leading-relaxed text-gray-600">
                We comply with GDPR, DPDP, and POPIA regulations to ensure your privacy is
                protected.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect } from 'react';
import { X, ShieldCheck, FileText, CheckCircle, AlertTriangle, Scale, Mail, Globe, ExternalLink, ChevronRight } from 'lucide-react';

export default function TermsOfServiceModal({ isOpen, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="legal-modal-overlay" onClick={onClose}>
      <div 
        className="legal-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
      >
        {/* Sticky Header */}
        <div className="legal-modal-header">
          <div className="legal-modal-header-left">
            <div className="legal-modal-icon-badge">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 id="terms-modal-title" className="legal-modal-title">Terms of Service</h2>
              <span className="legal-modal-subtitle">DripMorph Legal & Community Agreement</span>
            </div>
          </div>
          <button 
            type="button" 
            className="legal-modal-close-btn"
            onClick={onClose}
            aria-label="Close Terms of Service"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="legal-modal-body">
          {/* Document Header Banner */}
          <div className="legal-doc-banner">
            <div className="legal-doc-brand">
              <span className="legal-doc-title">DRIPMORPH</span>
              <span className="legal-doc-type">TERMS OF SERVICE</span>
            </div>
            <div className="legal-doc-meta">
              <span><strong>Effective Date:</strong> July 9, 2026</span>
              <span className="legal-dot-divider">•</span>
              <span><strong>Last Updated:</strong> August 8, 2026</span>
              <span className="legal-dot-divider">•</span>
              <span><strong>Website:</strong> www.dripmorph.com</span>
            </div>
          </div>

          {/* Plain-Language Summary Box */}
          <div className="legal-summary-card">
            <div className="legal-summary-header">
              <FileText size={16} />
              <span>PLAIN-LANGUAGE SUMMARY OF TERMS</span>
            </div>
            <p className="legal-summary-text">
              By using DripMorph, you agree to follow our community rules: post only your own fashion photos, 
              respect others, and refrain from gaming the AI scoring or leaderboard system. You retain ownership 
              of your photos, but grant DripMorph a license to display them within the app. AI fashion ratings are 
              provided for entertainment and personal styling purposes without warranties. You must be at least 18 
              years of age to use the platform. You can delete your account at any time, and we respect intellectual 
              property takedown requests under Indian law.
            </p>
          </div>

          {/* Preamble */}
          <div className="legal-section">
            <p className="legal-paragraph">
              Welcome to <strong>DripMorph</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), available via 
              {' '}<a href="https://www.dripmorph.com" target="_blank" rel="noopener noreferrer" className="legal-link">www.dripmorph.com</a>{' '}
              and our mobile application. These Terms of Service (&quot;Terms&quot;) govern your access to and use of DripMorph, 
              including our AI-powered outfit rating system, city and global leaderboards, &quot;Shop the Look&quot; affiliate 
              links, and related services (collectively, the &quot;Services&quot;).
            </p>
            <p className="legal-paragraph">
              By creating an account, downloading, or using DripMorph, you agree to be bound by these Terms. 
              If you do not agree to these Terms, you must not access or use the Services.
            </p>
          </div>

          {/* 1. Age Requirements */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">1.</span> AGE REQUIREMENTS & ELIGIBILITY (STRICT 18+ REQUIREMENT)
            </h3>
            <p className="legal-paragraph">
              DripMorph is strictly intended for adult users. You must be at least <strong>18 years of age</strong> to 
              create an account, access, or use DripMorph. Individuals under 18 years of age are strictly prohibited from 
              creating an account or submitting personal data to the Services. By creating an account or using the Services, 
              you represent and warrant that you are at least 18 years of age and possess the legal capacity to enter into a 
              binding agreement under the <em>Indian Contract Act, 1872</em>.
            </p>
          </div>

          {/* 2. User Accounts */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">2.</span> USER ACCOUNTS & REGISTRATION
            </h3>
            <ul className="legal-list">
              <li>
                <strong>Account Creation:</strong> You may register via email or third-party authentication (Google OAuth). 
                You agree to provide accurate, complete, and updated information.
              </li>
              <li>
                <strong>Account Security:</strong> You are responsible for safeguarding your login credentials and for all activities 
                that occur under your account. You must notify us immediately of any unauthorized account access.
              </li>
              <li>
                <strong>Mandatory City Selection:</strong> During onboarding, you must select a display city. City selections for 
                posted outfits are locked upon submission to maintain leaderboard integrity.
              </li>
            </ul>
          </div>

          {/* 3. UGC & License Grant */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">3.</span> USER-GENERATED CONTENT (UGC) & LICENSE GRANT
            </h3>
            <ul className="legal-list">
              <li>
                <strong>Content Ownership:</strong> You retain all ownership rights to the outfit photos, captions, tagged links, 
                and commentary (&quot;User-Generated Content&quot; or &quot;UGC&quot;) that you submit to DripMorph.
              </li>
              <li>
                <strong>License to DripMorph:</strong> By posting UGC on DripMorph, you grant us a worldwide, non-exclusive, 
                royalty-free, transferable license to host, store, cache, reproduce, display, and distribute your content across 
                our app, web domain (www.dripmorph.com), leaderboards, and promotional channels.
              </li>
              <li>
                <strong>Third-Party Likeness & Bystanders:</strong> You represent and warrant that you own or have obtained all 
                necessary rights, releases, and permissions for any individuals appearing in your posted photos. You agree not to 
                post photos containing identifiable likenesses of third parties without their express consent.
              </li>
            </ul>
          </div>

          {/* 4. Prohibited Conduct */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">4.</span> PROHIBITED CONDUCT & COMMUNITY RULES
            </h3>
            <p className="legal-paragraph">
              To ensure a safe and fair environment, you agree not to engage in any of the following prohibited activities:
            </p>
            <ul className="legal-list">
              <li>
                <strong>Anti-Gaming & System Manipulation:</strong> Attempting to bypass daily submission limits, re-uploading 
                identical photos to re-roll AI ratings, or using bots/scripts to artificially boost &quot;Hype&quot; counts or 
                leaderboard positions.
              </li>
              <li>
                <strong>Harmful or Obscene Content:</strong> Uploading nudity, sexually explicit material, violence, hate speech, 
                harassment, body-shaming, or defamatory content.
              </li>
              <li>
                <strong>Inappropriate AI Exploitation:</strong> Attempting to upload images designed to jailbreak, confuse, or 
                exploit the AI scoring system.
              </li>
              <li>
                <strong>Intellectual Property Infringement:</strong> Uploading photos or tagging affiliate links that violate 
                third-party copyrights, trademarks, or proprietary rights.
              </li>
              <li>
                <strong>City Switch Abuse:</strong> Changing profile city locations mid-week for the purpose of manipulating 
                local city leaderboards.
              </li>
            </ul>
          </div>

          {/* 5. IP Takedown */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">5.</span> INTELLECTUAL PROPERTY TAKEDOWN & COUNTER-NOTICE PROCESS
            </h3>
            <p className="legal-paragraph">
              DripMorph respects the intellectual property rights of others and complies with applicable Indian laws, 
              including the <em>Information Technology Act, 2000</em>, and rules thereunder. If you believe that your 
              copyrighted work or trademark has been copied and posted on the Services in a way that constitutes infringement, 
              you may submit an infringement notice to our designated Grievance Officer.
            </p>

            <h4 className="legal-subheading">A. Infringement Claim Notice</h4>
            <p className="legal-paragraph">Your takedown claim must include the following information:</p>
            <ul className="legal-list">
              <li>A physical or electronic signature of the copyright or trademark owner (or authorized representative);</li>
              <li>A clear description of the protected work claimed to have been infringed;</li>
              <li>Identification of the specific material on DripMorph claimed to be infringing, including URLs or post identifiers sufficient to locate the content;</li>
              <li>Your contact information (full name, mailing address, telephone number, and email address);</li>
              <li>A statement that the claim is made in good faith and that you believe the contested use is not authorized by the intellectual property owner, its agent, or the law; and</li>
              <li>A statement that the information in the notice is accurate, and an acknowledgement that you may be held liable under applicable Indian law (including for civil damages and criminal prosecution) for knowingly submitting false or misleading claims.</li>
            </ul>
            <p className="legal-paragraph">
              Upon receipt of a valid notice, DripMorph will promptly remove or disable access to the allegedly infringing 
              content and notify the user who posted it.
            </p>

            <h4 className="legal-subheading">B. Counter-Notice Process</h4>
            <p className="legal-paragraph">
              If you believe your content was removed or disabled by mistake or misidentification, you may submit a 
              written counter-notice to our Grievance Officer containing:
            </p>
            <ul className="legal-list">
              <li>Your physical or electronic signature;</li>
              <li>Identification of the material that was removed or disabled and its former location in the App;</li>
              <li>Your name, address, telephone number, and email address; and</li>
              <li>A statement that you have a good-faith belief that the material was removed or disabled as a result of mistake or misidentification, acknowledging liability under applicable Indian law for making knowingly false statements.</li>
            </ul>
            <p className="legal-paragraph">
              Upon receiving a valid counter-notice, DripMorph may forward it to the original complaining party. 
              If the complaining party does not initiate legal proceedings before a competent body within 10 to 14 business days, 
              DripMorph may restore the removed content at its sole discretion.
            </p>
          </div>

          {/* 6. AI Outfit Rating Disclaimer */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">6.</span> AI OUTFIT RATING & LEADERBOARDS DISCLAIMER
            </h3>
            <p className="legal-paragraph">
              DripMorph utilizes automated server-side Artificial Intelligence (Google Gemini AI) to analyze outfit style, 
              fit, color coordination, creativity, and trends. You acknowledge and agree that:
            </p>
            <ul className="legal-list">
              <li>
                AI ratings and comments are generated automatically and are provided purely for entertainment, 
                informational, and personal styling purposes.
              </li>
              <li>
                AI scores do not represent objective facts, professional styling advice, or human consensus.
              </li>
              <li>
                Weekly leaderboard resets (occurring every Sunday night) are processed automatically, and snapshot 
                rankings are final. DripMorph reserves the right to disqualify or adjust scores of any post flagged for 
                system gaming or policy violations.
              </li>
            </ul>
          </div>

          {/* 7. Shop the Look & Affiliate */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">7.</span> &quot;SHOP THE LOOK&quot; & AFFILIATE MONETIZATION DISCLOSURE
            </h3>
            <p className="legal-paragraph">
              DripMorph includes a &quot;Shop the Look&quot; feature allowing users and creators to tag clothing items with 
              commercial affiliate links. You acknowledge that:
            </p>
            <ul className="legal-list">
              <li>
                DripMorph or content creators may earn an affiliate commission when you tap a tagged link and complete 
                a purchase on a third-party retail platform.
              </li>
              <li>
                DripMorph does not own, manufacture, sell, ship, or guarantee any items featured in &quot;Shop the Look&quot; 
                hotspots. Purchases are completed entirely on third-party websites subject to their respective terms and return policies.
              </li>
            </ul>
          </div>

          {/* 8. Content Moderation & Deletion */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">8.</span> CONTENT MODERATION, USER ACCOUNT DELETION & TERMINATION
            </h3>
            <ul className="legal-list">
              <li>
                <strong>Reporting & Flagging:</strong> DripMorph provides in-app reporting tools allowing users to flag 
                inappropriate content or profile behavior.
              </li>
              <li>
                <strong>Moderation Rights:</strong> We reserve the right (but assume no obligation) to pre-screen, review, 
                flag, filter, modify, refuse, or remove any UGC that violates these Terms or applicable laws.
              </li>
              <li>
                <strong>User-Initiated Account Deletion:</strong> You have the explicit right to delete your account at any time. 
                You can initiate account deletion directly within the App settings or by contacting our support team at 
                {' '}<a href="mailto:support@dripmorph.com" className="legal-link">support@dripmorph.com</a>. Upon account deletion, 
                your personal data and uploaded outfit posts will be purged from our active systems in accordance with the specific 
                retention and deletion timeframes outlined in our Privacy Policy.
              </li>
              <li>
                <strong>Suspension & Termination by DripMorph:</strong> DripMorph may suspend or permanently terminate your account 
                without prior notice if you breach these Terms, engage in system gaming, or violate community guidelines.
              </li>
            </ul>
          </div>

          {/* 9. Limitation of Liability */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">9.</span> LIMITATION OF LIABILITY & WARRANTY DISCLAIMER
            </h3>
            <div className="legal-disclaimer-card">
              <div className="legal-disclaimer-header">
                <AlertTriangle size={16} />
                <span>DISCLAIMER OF WARRANTIES & LIABILITY</span>
              </div>
              <p className="legal-disclaimer-text">
                THE SERVICES ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY 
                KIND, EXPRESS OR IMPLIED. DRIPMORPH DISCLAIMS ALL WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR 
                PURPOSE, AND NON-INFRINGEMENT. IN NO EVENT SHALL DRIPMORPH, ITS FOUNDERS, OR AFFILIATES BE LIABLE FOR ANY 
                INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP, AI SCORING, OR 
                AFFILIATE PURCHASES.
              </p>
            </div>
          </div>

          {/* 10. Indemnification */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">10.</span> INDEMNIFICATION
            </h3>
            <p className="legal-paragraph">
              You agree to defend, indemnify, and hold harmless DripMorph, its founders, officers, and service providers from 
              and against any claims, liabilities, damages, judgments, losses, or expenses (including reasonable legal fees) 
              arising out of your UGC, your violation of these Terms, or your infringement of any third-party rights.
            </p>
          </div>

          {/* 11. Force Majeure */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">11.</span> FORCE MAJEURE
            </h3>
            <p className="legal-paragraph">
              DripMorph shall not be liable for any failure or delay in performing its obligations under these Terms where such 
              failure or delay results from events, causes, or conditions beyond our reasonable control. Such events include, 
              but are not limited to, natural disasters, acts of God, pandemics, power outages, telecommunication or internet 
              infrastructure failures, server outages, cyberattacks, riots, acts of civil or military authority, or changes in 
              applicable legislation or governmental regulations.
            </p>
          </div>

          {/* 12. Governing Law & Arbitration */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">12.</span> GOVERNING LAW, MANDATORY ARBITRATION & DISPUTE RESOLUTION
            </h3>
            <ul className="legal-list">
              <li>
                <strong>Governing Law:</strong> These Terms shall be governed by and construed in accordance with the laws 
                of India, without regard to its conflict of law principles.
              </li>
              <li>
                <strong>Mandatory Binding Arbitration:</strong> Any dispute, controversy, or claim arising out of or in connection 
                with these Terms or the Services, including any question regarding their existence, validity, or termination, 
                shall first be referred to and finally resolved by binding arbitration in accordance with the provisions of 
                the <em>Arbitration and Conciliation Act, 1996</em> (as amended). The seat and venue of arbitration shall be 
                <strong> Kolkata, West Bengal, India</strong>. The tribunal shall consist of a sole arbitrator appointed mutually 
                by the parties. The language of arbitration shall be English.
              </li>
              <li>
                <strong>Fallback Court Jurisdiction:</strong> Subject to the mandatory arbitration clause above, the courts of 
                competent jurisdiction located in West Bengal, India, shall have exclusive jurisdiction over any legal suit, 
                action, or proceeding arising out of or relating to these Terms, including applications for interim relief, 
                injunctions, or enforcement of arbitral awards.
              </li>
              <li>
                <strong>Consumer Protection Act Carve-Out:</strong> Nothing in these Terms or this Section 12 shall restrict, 
                limit, or impair a user&apos;s statutory rights to file a complaint or seek legal remedies before a competent 
                Consumer Disputes Redressal Commission under the <em>Consumer Protection Act, 2019</em>, in the jurisdiction 
                of their place of residence, particularly in connection with commercial affiliate transactions or consumer 
                interactions facilitated via &quot;Shop the Look.&quot;
              </li>
            </ul>
          </div>

          {/* 13. Severability */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">13.</span> SEVERABILITY
            </h3>
            <p className="legal-paragraph">
              If any provision of these Terms is held by a court or tribunal of competent jurisdiction to be invalid, 
              illegal, or unenforceable, such provision shall be eliminated or limited to the minimum extent necessary so that 
              the remaining provisions of these Terms will continue in full force and effect.
            </p>
          </div>

          {/* 14. Entire Agreement */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">14.</span> ENTIRE AGREEMENT
            </h3>
            <p className="legal-paragraph">
              These Terms, together with the DripMorph Privacy Policy, constitute the sole and entire agreement between you 
              and DripMorph regarding the Services, superseding all prior and contemporaneous understandings, agreements, 
              representations, and warranties, both written and oral, regarding the Services.
            </p>
          </div>

          {/* 15. Assignment */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">15.</span> ASSIGNMENT
            </h3>
            <p className="legal-paragraph">
              DripMorph may freely assign, transfer, or delegate its rights and obligations under these Terms, in whole or in 
              part, without restriction, including in connection with a merger, acquisition, corporate reorganization, or sale 
              of assets. You may not assign or transfer any of your rights or obligations under these Terms without DripMorph&apos;s 
              prior written consent.
            </p>
          </div>

          {/* 16. Changes to Terms */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">16.</span> CHANGES TO THESE TERMS
            </h3>
            <p className="legal-paragraph">
              We may update or modify these Terms periodically to reflect app enhancements, legal changes, or technical requirements. 
              Any updates will be posted on this page with an updated &quot;Last Updated&quot; date. Material changes will be 
              communicated to users prior to taking effect via an in-app banner or notification email. Your continued access to 
              or use of DripMorph after modified Terms take effect constitutes your binding acceptance of the updated Terms.
            </p>
          </div>

          {/* 17. Grievance Redressal */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">17.</span> GRIEVANCE REDRESSAL MECHANISM (IT RULES 2021)
            </h3>
            <p className="legal-paragraph">
              In compliance with the <em>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</em>, 
              and DPDP rules, the contact details for our designated Grievance Officer are as follows:
            </p>
            <div className="legal-contact-card">
              <div className="legal-contact-row">
                <span className="legal-contact-label">Name:</span>
                <span className="legal-contact-val">Rishideep Mallick</span>
              </div>
              <div className="legal-contact-row">
                <span className="legal-contact-label">Designation:</span>
                <span className="legal-contact-val">Founder & CEO / Grievance Officer</span>
              </div>
              <div className="legal-contact-row">
                <span className="legal-contact-label">Email:</span>
                <span className="legal-contact-val">
                  <a href="mailto:grievance@dripmorph.com" className="legal-link">grievance@dripmorph.com</a> / {' '}
                  <a href="mailto:support@dripmorph.com" className="legal-link">support@dripmorph.com</a>
                </span>
              </div>
              <div className="legal-contact-row">
                <span className="legal-contact-label">Response Timeline:</span>
                <span className="legal-contact-val">Acknowledgement within 24 hours; complete grievance resolution within 15 days.</span>
              </div>
            </div>
          </div>

          {/* 18. Contact Information */}
          <div className="legal-section" style={{ marginBottom: '8px' }}>
            <h3 className="legal-section-title">
              <span className="legal-section-num">18.</span> CONTACT INFORMATION
            </h3>
            <p className="legal-paragraph">
              For general questions or support regarding these Terms of Service, please contact us:
            </p>
            <div className="legal-contact-card">
              <div className="legal-contact-row">
                <span className="legal-contact-label">Team:</span>
                <span className="legal-contact-val">DripMorph Support Team</span>
              </div>
              <div className="legal-contact-row">
                <span className="legal-contact-label">Website:</span>
                <span className="legal-contact-val">
                  <a href="https://www.dripmorph.com" target="_blank" rel="noopener noreferrer" className="legal-link">www.dripmorph.com</a>
                </span>
              </div>
              <div className="legal-contact-row">
                <span className="legal-contact-label">Email:</span>
                <span className="legal-contact-val">
                  <a href="mailto:support@dripmorph.com" className="legal-link">support@dripmorph.com</a>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="legal-modal-footer">
          <button 
            type="button" 
            className="legal-modal-btn-primary"
            onClick={onClose}
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}

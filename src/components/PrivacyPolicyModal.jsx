import React, { useEffect } from 'react';
import { X, Lock, FileText, CheckCircle, AlertTriangle, Scale, Mail, Globe, ExternalLink } from 'lucide-react';

export default function PrivacyPolicyModal({ isOpen, onClose }) {
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
        aria-labelledby="privacy-modal-title"
      >
        {/* Sticky Header */}
        <div className="legal-modal-header">
          <div className="legal-modal-header-left">
            <div className="legal-modal-icon-badge">
              <Lock size={20} />
            </div>
            <div>
              <h2 id="privacy-modal-title" className="legal-modal-title">Privacy Policy</h2>
              <span className="legal-modal-subtitle">DripMorph Data Protection & Privacy Framework</span>
            </div>
          </div>
          <button 
            type="button" 
            className="legal-modal-close-btn"
            onClick={onClose}
            aria-label="Close Privacy Policy"
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
              <span className="legal-doc-type">OFFICIAL PRIVACY POLICY</span>
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
              <span>PLAIN-LANGUAGE PRIVACY SUMMARY</span>
            </div>
            <p className="legal-summary-text">
              This Privacy Policy explains how DripMorph collects, uses, and protects your data. We collect your profile details,
              location choices, and uploaded outfit photos to rate your style using AI and publish leaderboards. We do not sell
              your personal data. Outfit photos are evaluated by Google Gemini AI exclusively for styling feedback without facial
              recognition or body analysis. You can request data deletion at any time. DripMorph is intended exclusively for
              adult users aged 18 and older.
            </p>
          </div>

          {/* Preamble */}
          <div className="legal-section">
            <p className="legal-paragraph">
              At <strong>DripMorph</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), operated via{' '}
              <a href="https://www.dripmorph.com" target="_blank" rel="noopener noreferrer" className="legal-link">www.dripmorph.com</a>, 
              we respect your privacy and are committed to protecting the personal data you share with us. This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you use our mobile application, DripMorph (the &quot;App&quot;), 
              and our related web services.
            </p>
            <p className="legal-paragraph">
              Please read this Privacy Policy carefully. By accessing or using DripMorph, you agree to the collection and 
              use of information in accordance with this policy. If you do not agree with these terms, please do not access or use the App.
            </p>
          </div>

          {/* 1. Information We Collect */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">1.</span> INFORMATION WE COLLECT
            </h3>
            <p className="legal-paragraph">
              We collect several types of information from and about users of our App to provide a personalized fashion 
              and AI-rating experience:
            </p>

            <h4 className="legal-subheading">A. Information You Provide Directly to Us</h4>
            <ul className="legal-list">
              <li>
                <strong>Account & Profile Information:</strong> When you register for an account (via email/password or Google OAuth), 
                we collect your email address, full name, username/handle, profile bio, avatar image, and optional social media links 
                (such as your Instagram profile URL).
              </li>
              <li>
                <strong>City & Location Data:</strong> During onboarding, you are required to select a display city. You also manually 
                select a city location for each outfit photo you post. We do not collect background location data or precise GPS 
                geofencing tracking data.
              </li>
              <li>
                <strong>User-Generated Content (UGC) & Identifiable Visual Data:</strong> Uploaded outfit photos, captions, tagged item details 
                (such as store links or product descriptions), comments, and user interactions (such as &quot;Hypes&quot; or upvotes). Outfit photos 
                may contain recognizable facial features or likenesses of the uploader or third-party bystanders. Such visual imagery is treated 
                as personal data under applicable laws.
              </li>
              <li>
                <strong>Reported Content:</strong> Information and notes you submit when flagging or reporting an outfit, item, or user for 
                content moderation.
              </li>
            </ul>

            <h4 className="legal-subheading">B. Information Processed by Artificial Intelligence (AI) & Third-Party Training Disclosure</h4>
            <ul className="legal-list">
              <li>
                <strong>Outfit Photos & Metadata:</strong> When you upload an outfit photo, the image is securely transmitted and processed 
                by our server-side AI model (Google Gemini AI via Supabase Edge Functions) to analyze fit, color coordination, creativity, 
                and trend scores, as well as generate constructive styling commentary.
              </li>
              <li>
                <strong>No Google AI Model Training (Paid API Services):</strong> DripMorph accesses the Google Gemini AI model exclusively 
                through Google&apos;s paid API services. Under Google&apos;s applicable terms for paid API usage, Google does not use your uploaded 
                outfit photos, prompts, or associated personal data to train or improve its public or foundational AI models. This commitment 
                applies specifically to paid-tier API usage; it would not apply if free-tier or unpaid API services were used, which DripMorph does 
                not use in production.
              </li>
            </ul>
            <p className="legal-paragraph" style={{ marginTop: '8px', fontStyle: 'italic' }}>
              <strong>Strict Privacy Note on AI Processing:</strong> Our AI analysis evaluates clothing styling choices exclusively. 
              It does not perform facial recognition, nor does it evaluate, score, or store body types, weight, physical features, or demographic traits.
            </p>

            <h4 className="legal-subheading">C. Information Collected Automatically</h4>
            <ul className="legal-list">
              <li>
                <strong>Usage & Device Data:</strong> Technical information regarding your mobile device, IP address, operating system version, 
                app interaction metrics, and submission limits (e.g., daily submission caps to prevent platform gaming and spam).
              </li>
              <li>
                <strong>Cookies & Web Technologies:</strong> When accessing our domain (www.dripmorph.com), standard cookies, local storage, 
                and web server logs are utilized for session security and site performance. Strictly necessary cookies (e.g., those required 
                for login sessions and security) are set automatically and do not require consent. Non-essential cookies, such as those used for 
                analytics, are only set after you provide affirmative consent via the cookie consent banner displayed on your first visit to 
                www.dripmorph.com. You may withdraw or modify your cookie consent at any time through the cookie preferences link in the website footer, 
                or by adjusting your browser settings to block or delete cookies.
              </li>
            </ul>
          </div>

          {/* 2. How We Use Your Information */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">2.</span> HOW WE USE YOUR INFORMATION
            </h3>
            <p className="legal-paragraph">
              <strong>Purpose Limitation:</strong> We process your personal data only for the specific purposes disclosed in this Privacy Policy. 
              We will not use your personal data for any new or materially different purpose beyond what is described here without providing you 
              notice and, where required under applicable law, obtaining your fresh consent.
            </p>
            <p className="legal-paragraph">We process collected data for the following specific purposes:</p>
            <ul className="legal-list">
              <li>
                <strong>Core App Functionality:</strong> Displaying your user profile, outfit submissions, AI ratings, and dynamic placement 
                on local (e.g., Kolkata) and global leaderboards.
              </li>
              <li>
                <strong>AI Outfit Evaluation:</strong> Running server-side analysis via secure Edge Functions to generate structured 
                sub-scores and constructive feedback comments.
              </li>
              <li>
                <strong>Community Leaderboards:</strong> Calculating weekly leaderboard resets, ranking snapshots, and historical trend indicators.
              </li>
              <li>
                <strong>&quot;Shop the Look&quot; & Affiliate Monetization:</strong> Rendering interactive hotspots on outfit photos and routing 
                users to third-party seller pages via affiliate URLs.
              </li>
              <li>
                <strong>Anti-Gaming & System Integrity:</strong> Enforcing rate caps, running image hashing checks to block resubmission re-rolls, 
                checking rating consistency, and preserving platform security.
              </li>
              <li>
                <strong>Moderation & Community Standards:</strong> Reviewing user-flagged content and upholding app safety policies.
              </li>
            </ul>
          </div>

          {/* 3. How We Share Your Information */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">3.</span> HOW WE SHARE YOUR INFORMATION & CROSS-BORDER DATA TRANSFERS
            </h3>
            <p className="legal-paragraph">
              We do not sell your personal data. We share data only under the following conditions:
            </p>
            <ul className="legal-list">
              <li>
                <strong>Publicly Visible Content:</strong> Your public profile (username, avatar, bio, city, Instagram link, Hype count, 
                top fits) and posted outfits, scores, and tagged &quot;Shop the Look&quot; items are accessible to other users in the app feeds.
              </li>
            </ul>

            <h4 className="legal-subheading">Third-Party Infrastructure & Service Providers:</h4>
            <ul className="legal-list">
              <li>
                <strong>Supabase:</strong> Cloud database, user authentication, storage buckets (avatars and outfit photos), and Edge Functions.
              </li>
              <li>
                <strong>Google Gemini AI API:</strong> Server-side computer vision rating engine. (API keys remain fully isolated server-side).
              </li>
              <li>
                <strong>Vercel:</strong> Web hosting and distribution infrastructure for www.dripmorph.com.
              </li>
              <li>
                <strong>Cross-Border Data Transfers:</strong> To provide our services, your personal data and uploaded photos may be transmitted, 
                processed, and stored on third-party cloud infrastructure (Supabase, Google Cloud, Vercel) located outside of India (including 
                servers in North America and Singapore). We ensure all cross-border processing adheres to strict legal safeguards, robust 
                encryption standards, and contractual protections in compliance with applicable data protection laws.
              </li>
              <li>
                <strong>Affiliate Merchants:</strong> Tapping a &quot;Shop the Look&quot; link redirects you to third-party retail partners. 
                We do not pass any personal user identifiers (such as user ID, email, name, or handle) to merchants. Merchants only receive 
                standard, non-identifying web affiliate referral codes to track purchase attribution.
              </li>
              <li>
                <strong>Legal & Regulatory Obligations:</strong> Disclosing information if required by law enforcement, court order, or to 
                defend legal claims and protect user safety.
              </li>
            </ul>
          </div>

          {/* 4. Affiliate Links */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">4.</span> AFFILIATE LINKS & ADVERTISING DISCLOSURE
            </h3>
            <p className="legal-paragraph">
              DripMorph incorporates affiliate monetization. Outfit posts may feature &quot;Shop the Look&quot; hotspot tags with 
              commercial affiliate links. If you purchase products through these links, DripMorph or the content creator may receive an 
              affiliate commission. Third-party sites maintain separate privacy policies for which we assume no liability.
            </p>
          </div>

          {/* 5. Google OAuth */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">5.</span> THIRD-PARTY AUTHENTICATION (GOOGLE OAUTH)
            </h3>
            <p className="legal-paragraph">
              When authenticating via Google OAuth, Google supplies basic account information (name, email address, profile photo). 
              This information is exclusively used to set up your DripMorph profile. We do not access or store your Google password.
            </p>
          </div>

          {/* 6. Data Storage & Retention */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">6.</span> DATA STORAGE, RETENTION, SECURITY, AND BREACH NOTIFICATION
            </h3>
            <ul className="legal-list">
              <li>
                <strong>Security Standards:</strong> We enforce Row-Level Security (RLS) on our database, HTTPS protocol encryption, 
                and isolated server-side executions to secure data transmissions.
              </li>
              <li>
                <strong>Specific Data Retention Periods:</strong> Active account data and public outfits remain accessible while your account 
                is open. Upon receiving a valid account deletion request, your account details and public outfit photos are purged from our 
                active database within 7 days. Secondary technical data, server logs, and secure database backups are completely purged and 
                overwritten within 30 days, except where longer retention is required by applicable law or active legal disputes.
              </li>
              <li>
                <strong>Data Breach Notification:</strong> In the event of a security breach compromising your personal data, DripMorph will 
                notify affected users and relevant supervisory authorities without undue delay and within timeframes mandated by law (including 
                DPDP Act guidelines), detailing the nature of the breach, affected data categories, and remedial steps taken.
              </li>
            </ul>
          </div>

          {/* 7. Age Eligibility */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">7.</span> AGE ELIGIBILITY & PRIVACY PROTECTION (STRICT 18+ REQUIREMENT)
            </h3>
            <p className="legal-paragraph">
              DripMorph is intended exclusively for individuals who are at least <strong>18 years of age or older</strong>. We do not knowingly 
              collect, process, track, or store personal data from individuals under 18 years of age. Individuals under 18 are strictly prohibited 
              from creating an account or providing any personal information on the App. If we become aware that we have inadvertently collected 
              personal data from a user under 18 years of age, we will take immediate steps to delete that information from our active databases 
              and permanently terminate the associated account.
            </p>
          </div>

          {/* 8. Your Data Rights & Choices */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">8.</span> YOUR DATA RIGHTS & CHOICES
            </h3>
            <p className="legal-paragraph">
              As a user of DripMorph, you have the following rights under India&apos;s <em>Digital Personal Data Protection (DPDP) Act, 2023</em>, 
              in relation to your personal data:
            </p>
            <ul className="legal-list">
              <li>
                <strong>Right to Access:</strong> You may request a summary of the personal data we hold about you and the processing activities 
                we carry out in relation to that data.
              </li>
              <li>
                <strong>Right to Correction & Updating:</strong> You may request correction, completion, and updating of any inaccurate or 
                incomplete personal data associated with your account.
              </li>
              <li>
                <strong>Right to Erasure:</strong> You may request deletion of your personal data at any time, including through the account deletion 
                process described in Section 6 above. Upon a valid request, your data will be purged in accordance with the retention timeframes 
                outlined in that section.
              </li>
              <li>
                <strong>Right to Withdraw Consent:</strong> You may withdraw any consent previously given for the processing of your personal data, 
                at any time and as easily as it was given. Withdrawal of consent does not affect the lawfulness of processing carried out based on consent 
                before its withdrawal, and may result in loss of access to some or all of the Services.
              </li>
              <li>
                <strong>Right to Nominate:</strong> In accordance with Section 14 of the DPDP Act, you may nominate another individual to exercise 
                these rights on your behalf in the event of your death or incapacity.
              </li>
              <li>
                <strong>Right to Grievance Redressal:</strong> You may file a complaint regarding the processing of your personal data with 
                DripMorph&apos;s Grievance Officer (see Section 11) in the first instance. If your grievance is not resolved to your satisfaction, 
                you have the right to file a complaint with the Data Protection Board of India.
              </li>
            </ul>
            <p className="legal-paragraph" style={{ marginTop: '8px' }}>
              You can also manage camera and photo library permissions at any time through your device settings.
            </p>
          </div>

          {/* 9. Changes to Privacy Policy */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">9.</span> CHANGES TO THIS PRIVACY POLICY
            </h3>
            <p className="legal-paragraph">
              We may update this Privacy Policy periodically to reflect app updates, legal requirements, or security developments. Any updates 
              will be posted on this page with an updated &quot;Last Updated&quot; date. Significant changes will be communicated via an in-app banner 
              or notification email prior to the effective date. Continued use of DripMorph after updates take effect constitutes acceptance of the modified policy.
            </p>
          </div>

          {/* 10. Governing Law & Arbitration */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">10.</span> GOVERNING LAW, MANDATORY ARBITRATION & DISPUTE RESOLUTION
            </h3>
            <ul className="legal-list">
              <li>
                <strong>Governing Law:</strong> This Privacy Policy and all matters arising from or relating to your use of DripMorph shall be 
                governed by and construed in accordance with the laws of India, without regard to its conflict of law principles.
              </li>
              <li>
                <strong>Mandatory Binding Arbitration:</strong> Any dispute, controversy, or claim arising out of or in connection with this 
                Privacy Policy or the Services, including any question regarding its existence, validity, or termination, shall first be referred 
                to and finally resolved by binding arbitration in accordance with the provisions of the <em>Arbitration and Conciliation Act, 1996</em> 
                (as amended). The seat and venue of arbitration shall be <strong>Kolkata, West Bengal, India</strong>. The tribunal shall consist of 
                a sole arbitrator appointed mutually by the parties. The language of arbitration shall be English.
              </li>
              <li>
                <strong>Fallback Court Jurisdiction:</strong> Subject to the mandatory arbitration clause above, the courts of competent jurisdiction 
                located in West Bengal, India, shall have exclusive jurisdiction over any legal suit, action, or proceeding arising out of or relating 
                to this Privacy Policy, including applications for interim relief, injunctions, or enforcement of arbitral awards.
              </li>
              <li>
                <strong>Consumer Protection Act Carve-Out:</strong> Nothing in this Privacy Policy or this Section 10 shall restrict, limit, or 
                impair a user&apos;s statutory rights to file a complaint or seek legal remedies before a competent Consumer Disputes Redressal Commission 
                under the <em>Consumer Protection Act, 2019</em>, in the jurisdiction of their place of residence, particularly in connection with 
                commercial affiliate transactions or consumer interactions facilitated via &quot;Shop the Look.&quot;
              </li>
            </ul>
          </div>

          {/* 11. Grievance Officer */}
          <div className="legal-section">
            <h3 className="legal-section-title">
              <span className="legal-section-num">11.</span> GRIEVANCE OFFICER (IT INTERMEDIARY GUIDELINES 2021)
            </h3>
            <p className="legal-paragraph">
              In compliance with the <em>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</em>, and DPDP rules, 
              the contact details of our designated Grievance Officer for handling user concerns, content moderation issues, or privacy requests are provided below:
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
                <span className="legal-contact-val">Acknowledgement within 24 hours; complete grievance redressal within 15 days of receipt.</span>
              </div>
            </div>
          </div>

          {/* 12. Contact Information */}
          <div className="legal-section" style={{ marginBottom: '8px' }}>
            <h3 className="legal-section-title">
              <span className="legal-section-num">12.</span> CONTACT US & SUPPORT
            </h3>
            <p className="legal-paragraph">
              For general questions or requests regarding this Privacy Policy, please reach out to us:
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

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Page;

class PageSeeder extends Seeder
{
    public function run(): void
    {
        $pages = [
            [
                'title' => 'Privacy Policy',
                'slug' => 'privacy-policy',
                'content' => "<h1>Privacy Policy</h1><p>Welcome to HealerNet. We prioritize your privacy and are committed to protecting your personal health and community data. This Privacy Policy details how we collect, store, and safeguard your information.</p><h2>1. Data Collection</h2><p>We collect essential user information such as email address, country, state, and district during registration to match you with appropriate regional WhatsApp healing communities.</p><h2>2. Information Protection</h2><p>All data transmitted through HealerNet is encrypted using enterprise-grade security protocols.</p>",
                'status' => 'published',
                'meta_title' => 'Privacy Policy — HealerNet',
                'meta_description' => 'Official privacy policy for the HealerNet platform and global community network.',
            ],
            [
                'title' => 'Terms & Conditions',
                'slug' => 'terms-and-conditions',
                'content' => "<h1>Terms & Conditions</h1><p>By accessing or using the HealerNet platform, you agree to comply with and be bound by the following terms of service.</p><h2>1. Community Guidelines</h2><p>HealerNet is a respectful space for clinical collaboration and peer healing. Harassment, spam, or false medical advice are strictly prohibited.</p><h2>2. Medical Disclaimer</h2><p>Content on HealerNet is for informational and community support purposes only and does not replace professional medical diagnosis.</p>",
                'status' => 'published',
                'meta_title' => 'Terms & Conditions — HealerNet',
                'meta_description' => 'Official terms of service and community guidelines for HealerNet users and practitioners.',
            ],
            [
                'title' => 'Terms & Conditions (Short)',
                'slug' => 'terms-conditions',
                'content' => "<h1>Terms & Conditions</h1><p>By accessing or using the HealerNet platform, you agree to comply with and be bound by our terms of service.</p>",
                'status' => 'published',
                'meta_title' => 'Terms & Conditions — HealerNet',
                'meta_description' => 'Official terms of service for HealerNet.',
            ],
            [
                'title' => 'Frequently Asked Questions (FAQ)',
                'slug' => 'faq',
                'content' => "<h1>Frequently Asked Questions</h1><h3>How do I join a localized WhatsApp community?</h3><p>Navigate to your user dashboard and click 'Join WhatsApp Group' under your assigned region.</p><h3>How do I update my practitioner profile?</h3><p>Go to Settings -> My Profile to update your credentials and badges.</p>",
                'status' => 'published',
                'meta_title' => 'FAQ & Help Center — HealerNet',
                'meta_description' => 'Find answers to common questions about HealerNet communities, practitioner verification, and account management.',
            ],
            [
                'title' => 'Refund Policy',
                'slug' => 'refund-policy',
                'content' => "<h1>Refund Policy</h1><h2>1. Membership & Event Refunds</h2><p>Requests for refunds on paid workshops or premium memberships can be submitted within 14 days of purchase.</p>2. Processing Window</h2><p>Approved refunds are credited to the original payment method within 5–7 business days.</p>",
                'status' => 'published',
                'meta_title' => 'Refund Policy — HealerNet',
                'meta_description' => 'HealerNet policy regarding membership and event registration refunds.',
            ],
            [
                'title' => 'Cookie Policy',
                'slug' => 'cookie-policy',
                'content' => "<h1>Cookie Policy</h1><p>We use essential cookies to maintain session state, secure user logins, and remember user language preferences. We do not sell tracking data to third parties.</p>",
                'status' => 'published',
                'meta_title' => 'Cookie Policy — HealerNet',
                'meta_description' => 'Information on how HealerNet uses cookies and local storage.',
            ],
            [
                'title' => 'Contact Information',
                'slug' => 'contact-us',
                'content' => "<h1>Contact Us</h1><p>Have questions or need assistance? Reach out to our dedicated support team:</p><ul><li><strong>Email:</strong> support@healernet.org</li><li><strong>Hours:</strong> Monday – Friday, 09:00 – 18:00 IST</li><li><strong>Address:</strong> HealerNet Global Headquarters, Bengaluru, Karnataka, India</li></ul>",
                'status' => 'published',
                'meta_title' => 'Contact Us — HealerNet',
                'meta_description' => 'Get in touch with the HealerNet support and administrative team.',
            ],
        ];

        foreach ($pages as $p) {
            Page::updateOrCreate(['slug' => $p['slug']], $p);
        }
    }
}

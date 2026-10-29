# Privacy policy

Effective October 29, 2026. This describes the PixlPrfct desktop prerelease and this repository's source. Hosted-installation operators must provide their own policy for their deployment and providers.

## Local desktop designs

No account is required. Drafts, preferences, and imported design contents stay in the application's profile on your computer. `.pixl` and Figma `.fig` imports are parsed locally; importing does not upload them to Figma or PixlPrfct maintainers. Exports go to a location you choose.

The desktop app contains no product analytics, advertising, automatic crash-report uploads, or automatic update service. There is no central PixlPrfct service receiving local designs. PixlPrfct does not separately encrypt local storage; use your operating system's account permissions and disk encryption when needed.

Local designs remain until you delete them or remove the app profile. Windows uninstall preserves that profile. Export backups before clearing application data. Default profile locations are `%APPDATA%\PixlPrfct` on Windows and `~/Library/Application Support/PixlPrfct` on macOS. Exported files elsewhere must be deleted separately.

## Fonts and other network content

Google Fonts requests are disabled by default in the desktop local-design session. Enable **View → Allow online fonts in local designs** and reopen your designs to allow them. Disable that option to stop new font requests. Already-loaded fonts may remain visible until a window closes. Installed system fonts and fallbacks work without the option; unavailable fonts can change a design's appearance.

When enabled, requests go to `fonts.googleapis.com` and `fonts.gstatic.com` for font families and weights used by the interface or design. Google receives normal connection information, including IP address and browser information. The font loader does not send your design's text; its availability probe uses the fixed sample `A`. See [Google's privacy policy](https://policies.google.com/privacy) and [Google Fonts FAQ](https://fonts.google.com/faq).

The browser and self-hosted web editor currently load Google Fonts automatically; the desktop preference does not change team-server pages. Operators should disclose or change that behavior for their deployment. HTML/CSS exports may contain Google Fonts imports.

Designs or custom CSS referencing remote images, videos, fonts, or other URLs can request those resources when opened or rendered. Those hosts receive normal connection information. Use embedded/local assets and review imported designs if you need to avoid these requests. External links use your browser's settings and the destination's privacy policy.

## Team servers and accounts

Connecting to a team server is optional. The server you choose receives account/authentication requests and designs saved to that workspace. Local drafts are separate; saving or importing into a shared workspace sends the design to that server. Authorized members and administrators may access shared designs according to server permissions.

Self-hosted accounts store profile names, emails, password hashes, sessions and security information, organization/team membership, invitations, designs, library permissions, and version history in the operator's database. Authentication and server/proxy logs may include IP addresses, user agents, and request information. Verification, password-reset, and invitation emails use the operator's mail provider. Session cookies support sign-in.

The operator controls hosting, database/mail providers, backups, retention, deletion, and privacy requests. Contact that operator about your account or server-held data. This policy does not promise a retention period or deletion mechanism on behalf of an independent operator.

## AI and MCP connections

MCP is optional and runs separately. Pairing an editor or granting an MCP client access to saved projects lets that client read and change those designs. Your chosen AI application may transmit information to its service under its own settings and privacy policy. Disconnect the bridge and remove filesystem access when no longer needed. PixlPrfct does not select an AI provider or send designs to one on its own.

## Downloads, support, and changes

GitHub hosts source, downloads, issues, and release automation under [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). Public issue submissions are public; do not attach private designs, credentials, or account records. Report vulnerabilities using [SECURITY.md](SECURITY.md). General app privacy questions can be raised in [repository issues](https://github.com/ninefingerwoodshop-ops/pixlprfct/issues); hosted-account requests belong with the server operator.

Policy changes are recorded in Git history with an updated effective date. Release notes identify material desktop data-handling changes.

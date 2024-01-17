**30 Jun 2022**

Fixing "Minting failed." error message poping on successful mint.

**31 May 2022**

Updated UI to reflect latest Metaplex Collection updates
Removed multi mint (not working right now with anti bot detection)

**26 Apr 2022**

Multi-mints feature :

You can now mint multiple NFTs in a single transaction.
This is V3.00 release.

**11 Mar 2022**

More user-friendly UI.

Fixed presale false :
- countdown enabled for WL when presale false
- if discountPrice is null, then mint becomes private to WL.

**03 Mar 2022**

endSettings now properly managed on front end :
- remaining time to mint when using end date settings
- total available updated when using end mint number settings

**17 Feb 2022**

Code cleanup, minor fixes, and added CI=false .env variable to avoid harmless compilation warnings generating build errors on user code customization.

**07 Feb 2022**

Renamed REACT_APP_SPL_TOKEN_NAME to REACT_APP_SPL_TOKEN_TO_MINT_NAME
Renamed REACT_APP_SPL_TOKEN_DECIMALS to REACT_APP_SPL_TOKEN_TO_MINT_DECIMALS

**31 Jan 2022**

REQUIRE A YARN INSTALL

Upgraded wallets list. Supported wallets are :

- Phantom
- Slope
- Solflare
- Solflare Web
- Sollet
- Sollet Extension
- Solong
- Ledger
- SafePal

**25 Jan 2022**

Fixed MINTING using spl-token functionality :
- price wasn't always properly displayed depending of spl-token decimals
- wallet balance wasn't anticipated properly

To do so, added REACT_APP_SPL_TOKEN_NAME and REACT_APP_SPL_TOKEN_DECIMALS env variable (set to 9 by default) where user should set the number of decimals being used on its spl-token. By default when creating a spl-token it has 9 decimals.

**21 Jan 2022**

Increased default timeout duration.

**10 Jan 2022**

Added One-click Vercel Deployment on README.

**09 Jan 2022**

THIS UPDATE REQUIRES A YARN INSTALL

Successful mint updates :
- displayed datas (remaining mints, remaining whitelist tokens, wallet remaining, etc.) are now updated properly.
- added "View on Explorer" link.
- added Confetti animation.

**07-08 Jan 2022**

Fixed issue with countdown being in conflict with whitelist.

**05 Jan 2022**

Added whitelist infos

**04 Jan 2022**

Initial commit :
- fork of exiled-apes candy machine V1 upgraded to candy machine V2.
- easy customizable responsive UI.

**To thank me with a small SOL tip :]**

`58SevvhmaN4SfCop2HkepAWyM5zykr7Afiv91PAAfPqR`

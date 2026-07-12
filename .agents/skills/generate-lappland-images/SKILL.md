---
name: generate-lappland-images
description: Generate Lappland (Arknights) illustration assets, prompts, and images. Use this skill whenever the user mentions generating, creating, designing, or integrating Lappland character assets, artwork, or illustration prompts for the login, registration, MFA, or other authentication pages in Runa.
---

# Lappland Image Generation Guide

This skill guides the generation of custom Lappland (Arknights) illustration assets used throughout Runa's authentication flows.

## 1. Stylistic Guidelines & Design Language

Any newly generated illustration must strictly adhere to the following artistic rules to maintain UI design continuity:

- **Subject**: **Lappland from Arknights** (silver hair, wolf ears, red eyes, double scars crossing over her face, expressive/eccentric character eyes).
- **Art Style**: Clean, high-contrast anime/manga drawing style. Focus on bold line art with minimal, flat shading.
- **Background**: **Pure, flat white (`#FFFFFF`) background**. This is critical to allow clean separation from background boundaries.
- **Aspect Ratio**: Typically **2:3** (for vertical card layouts) or **1:1** (for square containers).

---

## 2. Midjourney / Niji 6 Generation Guide

To generate matching illustrations, use the following parameter recipes:

### Midjourney / Niji 6 Prompt Recipe
```text
[Reference_Image_URL] Make a clean anime style illustration of Lappland from Arknights, [state details/actions], bold clean outlines, simple flat color shading, flat pure white background, --niji 6 --style expressive --iw 2.0 --ar 2:3
```
- **`--iw 2.0` (Image Weight)**: Focuses the model heavily on the style/composition of the reference image.
- **`--niji 6`**: Selects the anime-focused generator.
- **`--style expressive`**: Keeps outlines clean and limits painterly noise.

---

## 3. Prompts by State

When generating or editing images for specific application states, use these prompt patterns:

### A. Login & General Flow States
- **Welcome / Idle**: `Make an anime style image of lappland from Arknights looking forward and smiling warmly, welcoming the user, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines, flat colors`
- **Wrong Password**: `Make an anime style image of lappland from Arknights with a smug grin, holding her index finger to her lips, teasing the user for entering a wrong password, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`
- **User Not Found**: `Make an anime style image of lappland from Arknights looking confused, tilt head, holding a magnifying glass and looking at the screen, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`

### B. MFA (Multi-Factor Authentication) States
- **Passkey Verification**: `Make an anime style image of lappland from Arknights holding a glowing futuristic physical security key, looking focused, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`
- **Passkey Denied**: `Make an anime style image of lappland from Arknights looking disappointed, holding up her hands in an X shape showing access denied, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`
- **TOTP Authenticator**: `Make an anime style image of lappland from Arknights checking a code on a smartphone screen, smiling confidently, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`
- **TOTP Validation Error**: `Make an anime style image of lappland from Arknights sweating, looking panicked at an expired timer on her phone, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`
- **Email Code Sent**: `Make an anime style image of lappland from Arknights holding a classic sealed envelope letter, winking, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`
- **Email Code Error**: `Make an anime style image of lappland from Arknights looking distressed, holding a torn envelope, indicating a delivery error, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`
- **Backup Recovery Code**: `Make an anime style image of lappland from Arknights holding a glowing ancient gold key, representing recovery codes, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`
- **Backup Code Error**: `Make an anime style image of lappland from Arknights looking shocked, holding a snapped key in two halves, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`

### C. Registration & Password Strength States
- **Username Taken**: `Make an anime style image of lappland from Arknights looking frustrated and facepalming because the username is already taken, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`
- **Email Taken**: `Make an anime style image of lappland from Arknights looking annoyed and crossing her arms because the email address is already registered, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`
- **Both Taken**: `Make an anime style image of lappland from Arknights looking overwhelmed or pulling her hair in disbelief with a comical error effect, indicating both username and email are taken, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`
- **Password Complexity Progress (0-5 Stars)**:
  - **0 Stars**: `Make an anime style image of lappland from Arknights looking bored, lazy, and sleeping on a table because the password complexity progress has not started, 2:3 aspect ratio, pure white background, simple anime drawing style`
  - **1 Star**: `Make an anime style image of lappland from Arknights sitting at a desk looking slightly attentive, holding up one finger, 2:3 aspect ratio, pure white background, simple anime drawing style`
  - **2 Stars**: `Make an anime style image of lappland from Arknights showing a peace sign with two fingers, looking cute and slightly happy, 2:3 aspect ratio, pure white background, simple anime drawing style`
  - **3 Stars**: `Make an anime style image of lappland from Arknights smiling confidently, holding up a device showing three glowing stars, 2:3 aspect ratio, pure white background, simple anime drawing style`
  - **4 Stars**: `Make an anime style image of lappland looking very happy and thumbs up, holding up a device showing four glowing stars, 2:3 aspect ratio, pure white background, simple anime drawing style`
  - **5 Stars**: `Make an anime style image of lappland from Arknights looking extremely happy, celebrating with confetti and five glowing star icons, 2:3 aspect ratio, pure white background, simple anime drawing style`

---

## 4. How to Generate Images with Antigravity

When you are asked to generate or prototype one of these images, use the `generate_image` tool:

```json
{
  "ImageName": "lappland_<state_name>",
  "Prompt": "Make a clean anime style illustration of Lappland from Arknights, [insert state description here], bold clean outlines, simple flat color shading, flat pure white background, 2:3 aspect ratio",
  "ImagePaths": []
}
```

Save all generated assets to the designated target directory:
`c:\Users\akari\OneDrive\Documents\GitHub\Runa\apps\frontend\public\lappland`

---

## 5. Existing Reference Assets

Refer to these existing files in the repository directory `apps/frontend/public/lappland` to maintain consistency or to use them as reference images:

### Core States
- `lappland_welcome.png` / `lapplandWelcome.svg` (Welcome/Idle state)
- `lappland_wrong_password.png` / `lapplandWrongPassword.svg` (Wrong Password state)
- `lappland_user_not_found.png` / `lapplandUserNotFound.svg` (User Not Found state)

### Multi-Factor Authentication (MFA)
- `lappland_passkey.png` / `lapplandPasskey.svg` (Passkey verification state)
- `lappland_passkey_denied.png` / `lapplandPasskeyDenied.svg` (Passkey denied/error state)
- `lappland_totp.png` / `lapplandTOTP.svg` (TOTP validator state)
- `lappland_totp_error.png` / `lapplandTOTPError.svg` (TOTP validation error state)
- `lappland_backup.png` / `lapplandBackup.svg` (Backup recovery code state)
- `lappland_backup_error.png` / `lapplandBackUpCodeError.svg` (Backup code validation error state)

### Registration & Password Strength
- `lapplandRegisterPassword0.png` (Weakest password / lazy)
- `lapplandRegisterPassword1.png` (Weak password / 1 star)
- `lapplandRegisterPassword2.png` (2 stars / peace sign)
- `lapplandRegisterPassword3.png` (3 stars)
- `lapplandRegisterPassword4.png` (4 stars)
- `lapplandRegisterPassword5.png` (Strongest password / 5 stars celebration)
- `lapplandRegisterUsernameTaken.png` (Username taken error)
- `lapplandRegisterEmailTaken.png` (Email taken error)
- `lapplandRegisterBothTaken.png` (Both taken error)

# Lappland Art Assets & Image Generation Guide

This guide describes how to generate, vectorize, and implement the custom Lappland (Arknights) illustration assets used throughout the login, registration, and MFA flows in this project.

---

## 1. Stylistic Guidelines & Design Language

To maintain design continuity across all screens, any newly generated illustration must strictly adhere to the following artistic rules:

- **Subject**: **Lappland from Arknights** (silver hair, wolf ears, red eyes, double scars crossing over her face, expressive/eccentric character eyes).
- **Art Style**: Clean, high-contrast anime/manga drawing style. Focus on bold line art with minimal, flat shading.
- **Background**: **Pure, flat white (`#FFFFFF`) background**. This is critical because it allows vectorization engines to cleanly separate the background from the character outline.
- **Aspect Ratio**: Generally **2:3** (using `--ar 2:3` in Midjourney) to fit nicely in the vertical card layout, or **1:1** (`--ar 1:1`) for square containers.

---

## 2. Image Generation Prompts (AI Prompt Book)

Use these baseline prompts in your AI image generator of choice (e.g., Midjourney, DALL-E 3, or Stable Diffusion). For best results, use an existing image as an image-to-image reference (such as `lappland_wrong_password.png`) with a high image weight (`--iw 1.5` to `2.0` in Midjourney).

### A. Login & General Flow States

| State              | Intent / Emotion                   | Prompt Pattern                                                                                                                                                                                                                                    |
| :----------------- | :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Welcome / Idle** | Welcoming, neutral, cute           | `Make an anime style image of lappland from Arknights looking forward and smiling warmly, welcoming the user, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines, flat colors`                                    |
| **Wrong Password** | Smug, teasing, mock disappointment | `Make an anime style image of lappland from Arknights with a smug grin, holding her index finger to her lips, teasing the user for entering a wrong password, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines` |
| **User Not Found** | Confused, searching, curious       | `Make an anime style image of lappland from Arknights looking confused, tilt head, holding a magnifying glass and looking at the screen, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`                      |

### B. MFA (Multi-Factor Authentication) States

| State                     | Intent / Emotion                          | Prompt Pattern                                                                                                                                                                                                            |
| :------------------------ | :---------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Passkey Verification**  | Focused, holding passkey token            | `Make an anime style image of lappland from Arknights holding a glowing futuristic physical security key, looking focused, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`            |
| **Passkey Denied**        | Disappointed, cross mark, warning         | `Make an anime style image of lappland from Arknights looking disappointed, holding up her hands in an X shape showing access denied, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines` |
| **TOTP Authenticator**    | Checking phone / mobile device            | `Make an anime style image of lappland from Arknights checking a code on a smartphone screen, smiling confidently, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`                    |
| **TOTP Validation Error** | Panicking, incorrect timing, code expired | `Make an anime style image of lappland from Arknights sweating, looking panicked at an expired timer on her phone, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`                    |
| **Email Code Sent**       | Holding letter / envelope                 | `Make an anime style image of lappland from Arknights holding a classic sealed envelope letter, winking, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`                              |
| **Email Code Error**      | Tearing envelope, lost mail               | `Make an anime style image of lappland from Arknights looking distressed, holding a torn envelope, indicating a delivery error, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`       |
| **Backup Recovery Code**  | Holding safe key / ancient chest          | `Make an anime style image of lappland from Arknights holding a glowing ancient gold key, representing recovery codes, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`                |
| **Backup Code Error**     | Broken key, lockouts                      | `Make an anime style image of lappland from Arknights looking shocked, holding a snapped key in two halves, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`                           |

### C. Registration & Password Strength States

| State              | Trigger Criteria                | Prompt Pattern                                                                                                                                                                                                                                                            |
| :----------------- | :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Username Taken** | Form validation error           | `Make an anime style image of lappland from Arknights looking frustrated and facepalming because the username is already taken, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`                                                       |
| **Email Taken**    | Form validation error           | `Make an anime style image of lappland from Arknights looking annoyed and crossing her arms because the email address is already registered, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines`                                          |
| **Both Taken**     | Form validation error           | `Make an anime style image of lappland from Arknights looking overwhelmed or pulling her hair in disbelief with a comical error effect, indicating both username and email are taken, 2:3 aspect ratio, pure white background, simple anime drawing style, bold outlines` |
| **Password 0**     | Empty or 0 complexity rules met | `Make an anime style image of lappland from Arknights looking bored, lazy, and sleeping on a table because the password complexity progress has not started, 2:3 aspect ratio, pure white background, simple anime drawing style`                                         |
| **Password 1**     | 1 rule met (weak)               | `Make an anime style image of lappland from Arknights sitting at a desk looking slightly attentive, holding up one finger, 2:3 aspect ratio, pure white background, simple anime drawing style`                                                                           |
| **Password 2**     | 2 rules met                     | `Make an anime style image of lappland from Arknights showing a peace sign with two fingers, looking cute and slightly happy, 2:3 aspect ratio, pure white background, simple anime drawing style`                                                                        |
| **Password 3**     | 3 rules met                     | `Make an anime style image of lappland from Arknights smiling confidently, holding up a device showing three glowing stars, 2:3 aspect ratio, pure white background, simple anime drawing style`                                                                          |
| **Password 4**     | 4 rules met                     | `Make an anime style image of lappland looking very happy and thumbs up, holding up a device showing four glowing stars, 2:3 aspect ratio, pure white background, simple anime drawing style`                                                                             |
| **Password 5**     | All 5 rules met (very strong)   | `Make an anime style image of lappland from Arknights looking extremely happy, celebrating with confetti and five glowing star icons, 2:3 aspect ratio, pure white background, simple anime drawing style`                                                                |

### 2.1 Midjourney / Niji 6 Generation Guide: Case Study (`lapplandRegisterPassword2.png`)

To achieve the exact line-art styling and character consistency of assets like [lapplandRegisterPassword2.png](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa/apps/frontend/public/lapplandRegisterPassword2.png), use this prompt and parameter formula in Midjourney:

#### Prompt Recipe

```text
[Reference_Image_URL] Make a clean anime style illustration of Lappland from Arknights, showing a peace sign with two fingers, looking cute and slightly happy, bold clean outlines, simple flat color shading, flat pure white background, 2:3 aspect ratio --niji 6 --style expressive --iw 2.0 --ar 2:3
```

#### Detailed Parameter Breakdown:

- **`[Reference_Image_URL]`**: Host a baseline asset (e.g. [lapplandWelcome.svg](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa/apps/frontend/public/lapplandWelcome.svg) or an existing PNG) on Discord/Imgur and prepend its URL. This anchors the character features (scar, hair flow, wolf ears) to the rest of the flow.
- **`--iw 2.0` (Image Weight)**: Sets the maximum weight (2.0) on the reference image, forcing the generator to copy the structural style and color palette instead of inventing new ones.
- **`--niji 6`**: Utilizes the anime-native Niji model, which yields clean digital line-art and rich anime-eyes.
- **`--style expressive`**: Selects a style mode that renders cleaner line contours and limits excessive noise or messy painterly textures.
- **`--ar 2:3`**: Enforces a vertical aspect ratio, perfectly matching the login/registration card side-panels.

---

## 3. Vectorization Pipeline (PNG to SVGs)

Once you generate the raster PNG illustrations, Notify the user so he can convert them to svg and make react components

---

## 5. Integrating the Component in Forms

To display the image in forms with crossfade animations, use `AnimatePresence` from Framer Motion:

```tsx
import { motion, AnimatePresence } from "framer-motion";
import RrLapplandPassword0 from "../rrImages/rrLapplandPassword0";
import RrLapplandWelcomeImage from "../rrImages/rrLapplandWelcomeImage";

// Render logic:
<div className="relative w-full h-full flex items-center justify-center overflow-hidden">
  <AnimatePresence mode="wait">
    <motion.div
      key={activeStateKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 flex items-center justify-center p-6 text-foreground"
    >
      {activeState === "welcome" ? (
        <RrLapplandWelcomeImage className="w-full h-full object-contain max-h-[480px]" />
      ) : (
        <RrLapplandPassword0 className="w-full h-full object-contain max-h-[480px]" />
      )}
    </motion.div>
  </AnimatePresence>
</div>;
```

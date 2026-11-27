# InvestBiz recovery

The frontend build connected to investbiz-3d869 is in **dist**. Double-click
**Open-InvestBiz.cmd** to start the preview and open http://127.0.0.1:5173/
in your browser. If it starts a server, keep its window open while you browse.
After a restart, double-click the launcher again. Backend integrations require
their own services and configuration.

Editable code is in **src**, **frontend/src**, and **public**. The files that
survived in the InvestBiz project were copied byte-for-byte over the older
Downloads source. Missing tracked files were checked against local Git.
The package manifest and lockfile came from the same Downloads copy.

The prior session updated some behavior directly in the compiled build.
A rebuild from the recovered source can differ from the November preview.
The recovery-notes folder contains VS Code snapshots and differing Git
versions of missing files.

## Edit and build

Run npm ci to install the dependencies and npm run dev to start Vite.
To rebuild without replacing the recovered dist folder, run
npm run build -- --outDir dist-rebuilt. Stop the November preview first
if you want Vite to use port 5173.

The chat attachment upload helper was restored from the Downloads source
to make the recovered source compile. Its unmodified November file is
in recovery-notes/original-source.


## Save your changes

Open the InvestBiz-Recovered folder in VS Code. Edit the source files in src,
frontend/src and public. Use Ctrl+S to save a file or File > Save All for every
open file. To save after each edit automatically, use File > Auto Save.
Localhost displays the app. Your work is stored in the project folder.

The backup ZIP in your Windows user folder under InvestBiz-Backups is a
snapshot. Create another dated ZIP after major changes and keep the ZIP private.


## Firebase migration

Open-InvestBiz.cmd starts the React preview on port 5173 and, when its Python
environment exists, FastAPI on port 8000. From PowerShell at the project root:

    python -m venv backend/.venv
    .\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
    .\backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

FastAPI loads backend/.env and backend/firebase-service-account.json. Keep
both files private. The backend connectivity check is GET /api/health/firebase.
Admin login requires an email-verified Firebase account with an admin custom
claim. Local fallback assets live in backend/static/uploads and their URLs
work from this local server. KYC images are processed privately.

Onboarding stage data uses Realtime Database. Other legacy Firestore-backed
features require a provisioned Cloud Firestore database and reviewed rules.


## Investor KYC

Install the Python backend requirements, including DeepFace and tf-keras.
On Windows, use a short drive path to the virtual environment if TensorFlow
hits the filesystem path length limit.
For OCR, run npm install --prefix backend/.kyc-runtime tesseract.js@7.0.0.
Place English and Urdu tessdata_fast traineddata files under
backend/.kyc-runtime/tessdata/ as eng.traineddata and urd.traineddata.
Place the OpenCV Zoo face_detection_yunet_2023mar.onnx model at
backend/.kyc-runtime/yunet.onnx. DeepFace uses the FaceNet512 weights under
backend/.kyc-runtime/.deepface/weights/. Build the React app and run
Open-InvestBiz.cmd. Camera capture requires localhost or HTTPS.

The API stores identity evidence under backend/static/uploads/kyc/<uid>/<attempt>/.
File URLs require an authenticated owner or verified Firebase admin. Keep
that folder out of public copies and restrict access to the Windows account.
The left/right/straight prompt checks a short sequence of camera frames and
the final face. It is not a certified presentation-attack detection system.


## Investor pitch dossiers

Build to dist-rebuilt with the command above, then restart Open-InvestBiz.cmd.
The launcher uses dist-rebuilt when it exists. The React app connects directly to
the local FastAPI server through VITE_BACKEND_URL.

In the founder dashboard, open Investor dossiers, samples, agreements and chat.
Choose a published pitch to set the allocation, add media and upload the
agreement. The same panel receives sample requests, lets the founder send an
estimated delivery time and provides agreement countersignature and chat.

Deploy the reviewed database.rules.json and storage.rules to the intended
Firebase project before enabling the live dossier. They give participants
access to their records and keep agreement evidence in server-only storage.
Configure DOSSIER_SMTP settings in backend/.env for delivery and video-sign
email, and set DOSSIER_FRONTEND_ORIGIN to the stable browser origin used for
signing. WebAuthn uses the origin of that page. Keep that origin consistent
when enrolling and unlocking. Browser camera and device verification require
HTTPS or localhost. The device handles user verification. InvestBiz records the hash of the verified
credential ID.

Escrow checkout creates an intent from the countersigned chunk allocation and
PKR amount. Live settlement requires a payment provider. Marketplace showcase
pitches use the existing sandbox ledger and simulated sample approval.


## Founder workspace

Founder signup collects a bank statement, recent transaction screenshots and
exactly two references with CNIC images. Verified admins can open the evidence
from the Entrepreneur tab in the KYC dashboard and record their bank review.
Keep backend/static/uploads/founders on persistent private storage. The public
uploads mount rejects these nested paths. Owners and signed-in investors view
approved-for-publication certificate images through an authenticated API.

Use Pitch an Idea in the founder dashboard to author all three pitch steps.
FastAPI publishes the investor feed and catalog projections together and keeps
agreements and witness CNIC previews in private storage. Active reader counts
expire a little over a minute after the last heartbeat. The founder sees the
investor signature and CNIC in a pending agreement when the investor shared
those files at signing. Countersigning unlocks the escrow intent.

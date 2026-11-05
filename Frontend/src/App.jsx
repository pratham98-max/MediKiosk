import { useEffect, useState } from "react";
import "./App.css";
import PortalHeader from "./components/PortalHeader";
import PatientAuth from "./components/PatientAuth";
import PatientWelcome from "./components/PatientWelcome";
import LandingShowcase from "./components/LandingShowcase";
import DoctorPortal from "./components/DoctorPortal";
import StaffPortal from "./components/StaffPortal";
import HospitalSelector from "./components/HospitalSelector";
import ExternalEMRConsent from "./components/ExternalEMRConsent";
import MedicalTimeline from "./components/MedicalTimeline";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

function App() {
  // =========================
  // PORTAL & AUTH STATES
  // =========================
  const [activePortal, setActivePortal] = useState("patient"); // "patient" | "doctor" | "staff"
  const [currentPatient, setCurrentPatient] = useState(() => {
    try {
      const saved = localStorage.getItem("medikiosk_patient");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentDoctor, setCurrentDoctor] = useState(() => {
    try {
      const saved = localStorage.getItem("medikiosk_doctor");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentStaff, setCurrentStaff] = useState(() => {
    try {
      const saved = localStorage.getItem("medikiosk_staff");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Selected Hospital for consultation session
  const [selectedHospital, setSelectedHospital] = useState({
    hospital_id: "hosp-medikiosk",
    name: "MediKiosk General Hospital",
    address: "Block 4, Healthcare City, New Delhi - 110001",
    type: "current",
  });

  // External EMR consented data
  const [externalConsentData, setExternalConsentData] = useState(null);

  const [sessionOtpInfo, setSessionOtpInfo] = useState(null);

  // =========================
  // DOCTOR & VISIT CONSULTATION STATES
  // =========================
  const [consultationInfo, setConsultationInfo] = useState({
    doctorName: "Dr. On-Duty Physician",
    department: "General Medicine",
    visitReason: "New Health Concern",
    additionalNotes: "",
  });

  // =========================
  // LANGUAGE STATES
  // =========================

  const FALLBACK_LANGUAGES = [
    { code: "en", name: "English", native_name: "English" },
    { code: "hi", name: "Hindi", native_name: "हिंदी" },
    { code: "mr", name: "Marathi", native_name: "मराठी" },
  ];

  const [languages, setLanguages] = useState(FALLBACK_LANGUAGES);
  const [selectedLanguage, setSelectedLanguage] =
    useState(FALLBACK_LANGUAGES[0]);
  const [loading, setLoading] = useState(false);

  // =========================
  // SCREEN STATE: "welcome" -> "language" -> "interview" -> "summary" -> "documents" -> "clarification" -> "finalReport"
  // =========================

  const [screen, setScreen] =
    useState("welcome");

  // =========================
  // SESSION STATE
  // =========================

  const [sessionId, setSessionId] =
    useState(null);

  // =========================
  // CHAT STATES
  // =========================

  const [messages, setMessages] =
    useState([]);

  const [userInput, setUserInput] =
    useState("");

  const [interviewStatus, setInterviewStatus] =
    useState("continue");

  const [isSending, setIsSending] =
    useState(false);

  // =========================
  // VOICE INPUT
  // =========================

  const [isListening, setIsListening] =
    useState(false);

  // =========================
  // BASIC SUMMARY
  // =========================

  const [summary, setSummary] =
    useState("");

  const [summaryLoading, setSummaryLoading] =
    useState(false);

  // =========================
  // DOCUMENT STATES
  // =========================

  const [selectedFiles, setSelectedFiles] =
    useState([]);

  const [uploading, setUploading] =
    useState(false);

  const [uploadResults, setUploadResults] =
    useState([]);

  // =========================
  // CONTRADICTION STATES
  // =========================

  const [
    detectingContradictions,
    setDetectingContradictions
  ] = useState(false);

  const [contradictions, setContradictions] =
    useState([]);

  const [
    currentContradiction,
    setCurrentContradiction
  ] = useState(null);

  const [
    clarificationAnswer,
    setClarificationAnswer
  ] = useState("");

  const [
    clarificationLoading,
    setClarificationLoading
  ] = useState(false);

  // =========================
  // FINAL REPORT STATES
  // =========================

  const [finalReport, setFinalReport] =
    useState("");

  const [
    finalReportLoading,
    setFinalReportLoading
  ] = useState(false);


  // =========================
  // FETCH LANGUAGES
  // =========================

  useEffect(() => {
    fetch(`${API_BASE}/languages`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Unable to fetch languages"
          );
        }

        return response.json();
      })

      .then((data) => {
        if (data.languages && data.languages.length > 0) {
          setLanguages(data.languages);
          if (!selectedLanguage) {
            setSelectedLanguage(data.languages[0]);
          }
        }
        setLoading(false);
      })

      .catch((error) => {
        console.warn(
          "Could not fetch dynamic languages, using fallback:",
          error
        );
        setLoading(false);
      });
  }, []);


  // =========================
  // AUTH HELPERS
  // =========================

  const handleLoginSuccess = (patientData) => {
    setCurrentPatient(patientData);
    try {
      localStorage.setItem("medikiosk_patient", JSON.stringify(patientData));
    } catch (e) {
      console.error("Failed saving patient to storage", e);
    }
    // Flow: Patient Login -> Select Hospital -> Doctor/Department flow
    setScreen("hospitalSelect");
  };

  const handleLogout = () => {
    setCurrentPatient(null);
    try {
      localStorage.removeItem("medikiosk_patient");
    } catch (e) {
      console.error("Failed clearing patient from storage", e);
    }
    startNewPatient();
  };

  const handleDoctorLogin = (doctorData) => {
    setCurrentDoctor(doctorData);
    try {
      localStorage.setItem("medikiosk_doctor", JSON.stringify(doctorData));
    } catch (e) {
      console.error("Failed saving doctor to storage", e);
    }
  };

  const handleDoctorLogout = () => {
    setCurrentDoctor(null);
    try {
      localStorage.removeItem("medikiosk_doctor");
    } catch (e) {
      console.error("Failed clearing doctor from storage", e);
    }
  };

  const handleStaffLogin = (staffData) => {
    setCurrentStaff(staffData);
    try {
      localStorage.setItem("medikiosk_staff", JSON.stringify(staffData));
    } catch (e) {
      console.error("Failed saving staff to storage", e);
    }
  };

  const handleStaffLogout = () => {
    setCurrentStaff(null);
    try {
      localStorage.removeItem("medikiosk_staff");
    } catch (e) {
      console.error("Failed clearing staff from storage", e);
    }
  };

  // Callback when patient confirms hospital selection
  const handleHospitalSelected = (hosp) => {
    setSelectedHospital(hosp);
    setScreen("welcome");
  };

  // =========================
  // END CONSULTATION (patient)
  // =========================

  const handleEndConsultation = () => {
    // Reset all session state and return patient to their portal home
    setScreen("welcome");
    setSessionId(null);
    setMessages([]);
    setInterviewStatus("continue");
    setSummary("");
    setSelectedFiles([]);
    setUploadResults([]);
    setContradictions([]);
    setCurrentContradiction(null);
    setClarificationAnswer("");
    setFinalReport("");
    setUserInput("");
    setSelectedLanguage(null);
    setSessionOtpInfo(null);
    setExternalConsentData(null);
  };

  // Callback when patient confirms doctor selection on Welcome screen
  const handleProceedFromWelcome = (docInfo) => {
    setConsultationInfo(docInfo);
    setScreen("language");
  };

  // =========================
  // START INTERVIEW
  // =========================

  const handleContinue = async () => {
    if (!selectedLanguage) {
      alert(
        "Please select a language"
      );

      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/session`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            language:
              selectedLanguage.code,
            patient_id:
              currentPatient?.patient_id || null,
            doctor_name:
              consultationInfo.doctorName,
            department:
              consultationInfo.department,
            hospital_id:
              selectedHospital.hospital_id || "hosp-medikiosk",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to create interview session"
        );
      }

      const data =
        await response.json();

      setSessionId(
        data.session_id
      );

      // =========================
      // RESET SESSION STATES
      // =========================

      setInterviewStatus(
        "continue"
      );

      setSummary("");

      setSelectedFiles([]);

      setUploadResults([]);

      setContradictions([]);

      setCurrentContradiction(null);

      setClarificationAnswer("");

      setFinalReport("");

      setUserInput("");

      setMessages([]);


      // =========================
      // INITIAL GREETING
      // =========================

      let firstMessage = "";

      if (
        selectedLanguage.code === "en"
      ) {
        firstMessage =
          "Hello! What health problem are you experiencing today?";
      }

      else if (
        selectedLanguage.code === "hi"
      ) {
        firstMessage =
          "नमस्ते! आज आपको कौन सी स्वास्थ्य समस्या हो रही है?";
      }

      else if (
        selectedLanguage.code === "mr"
      ) {
        firstMessage =
          "नमस्कार! आज तुम्हाला कोणती आरोग्य समस्या जाणवत आहे?";
      }


      setMessages([
        {
          sender: "ai",
          text: firstMessage,
        },
      ]);

      setScreen(
        "interview"
      );

    } catch (error) {
      console.error(
        "Error creating session:",
        error
      );

      alert(
        "Unable to start the interview. Please check the backend."
      );
    }
  };


  // =========================
  // VOICE INPUT
  // =========================

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Speech recognition is not supported in this browser."
      );

      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang =
      selectedLanguage?.code === "hi"
        ? "hi-IN"
        : selectedLanguage?.code === "mr"
        ? "mr-IN"
        : "en-US";

    recognition.interimResults =
      false;

    recognition.continuous =
      false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const spokenText =
        event.results[0][0].transcript;

      setUserInput(
        spokenText
      );
    };

    recognition.onerror = (event) => {
      console.error(
        "Speech recognition error:",
        event.error
      );

      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };


  // =========================
  // GET BASIC SUMMARY
  // =========================

  const fetchSummary = async (
    currentSessionId
  ) => {
    setSummaryLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/session/${currentSessionId}/summary`
      );

      if (!response.ok) {
        throw new Error(
          "Unable to generate summary"
        );
      }

      const data =
        await response.json();

      if (data.summary) {
        setSummary(
          data.summary
        );
      }

      else {
        setSummary(
          "Unable to generate the interview summary."
        );
      }

    } catch (error) {
      console.error(
        "Error fetching summary:",
        error
      );

      setSummary(
        "Unable to generate the interview summary."
      );

    } finally {
      setSummaryLoading(false);

      setScreen(
        "summary"
      );
    }
  };


  // =========================
  // SEND MESSAGE
  // =========================

  const sendMessage = async () => {
    if (
      interviewStatus !== "continue"
    ) {
      return;
    }

    if (isSending) {
      return;
    }

    if (!userInput.trim()) {
      return;
    }

    if (!sessionId) {
      alert(
        "Interview session not found. Please restart."
      );

      return;
    }

    const messageToSend =
      userInput.trim();


    // Show patient message

    setMessages(
      (previousMessages) => [
        ...previousMessages,
        {
          sender: "user",
          text: messageToSend,
        },
      ]
    );

    setUserInput("");

    setIsSending(true);


    try {
      const response = await fetch(
        `${API_BASE}/chat`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            message:
              messageToSend,

            language:
              selectedLanguage.code,

            session_id:
              sessionId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to communicate with backend"
        );
      }

      const data =
        await response.json();


      if (
        data.interview_status
      ) {
        setInterviewStatus(
          data.interview_status
        );
      }


      if (data.reply) {
        setMessages(
          (previousMessages) => [
            ...previousMessages,
            {
              sender: "ai",
              text: data.reply,
            },
          ]
        );
      }


      // =========================
      // INTERVIEW FINISHED
      // =========================

      if (
        data.interview_status ===
          "completed" ||

        data.interview_status ===
          "red_flag"
      ) {
        setTimeout(() => {
          fetchSummary(
            sessionId
          );
        }, 1200);
      }

    } catch (error) {
      console.error(
        "Error connecting to backend:",
        error
      );

      setMessages(
        (previousMessages) => [
          ...previousMessages,
          {
            sender: "ai",

            text:
              "Sorry, there was a problem connecting to MediKiosk.",
          },
        ]
      );

    } finally {
      setIsSending(false);
    }
  };


  // =========================
  // UPLOAD DOCUMENTS
  // =========================

  const uploadDocuments = async () => {
    if (
      selectedFiles.length === 0
    ) {
      alert(
        "Please select at least one document."
      );

      return;
    }

    if (!sessionId) {
      alert(
        "Session not found. Please restart."
      );

      return;
    }

    setUploading(true);

    setUploadResults([]);


    try {
      const results = [];

      for (
        const file of selectedFiles
      ) {
        const formData =
          new FormData();

        formData.append(
          "session_id",
          sessionId
        );

        formData.append(
          "file",
          file
        );

        const response =
          await fetch(
            `${API_BASE}/upload-documents`,
            {
              method: "POST",
              body: formData,
            }
          );

        if (!response.ok) {
          throw new Error(
            `Failed to upload ${file.name}`
          );
        }

        const data =
          await response.json();

        if (!data.success) {
          throw new Error(
            data.error ||
              `Failed to process ${file.name}`
          );
        }

        results.push(
          data
        );
      }

      setUploadResults(
        results
      );

    } catch (error) {
      console.error(
        "Document upload error:",
        error
      );

      alert(
        error.message ||
          "Unable to upload documents."
      );

    } finally {
      setUploading(false);
    }
  };


  // =========================
  // GET NEXT PENDING
  // CONTRADICTION
  // =========================

  const loadNextContradiction =
    async () => {

      if (!sessionId) {
        return false;
      }

      try {
        const response =
          await fetch(
            `${API_BASE}/session/${sessionId}/next-contradiction`
          );

        if (!response.ok) {
          throw new Error(
            "Unable to get next contradiction"
          );
        }

        const data =
          await response.json();

        if (
          data.status === "pending" &&
          data.contradiction
        ) {
          setCurrentContradiction(
            data.contradiction
          );

          setClarificationAnswer("");

          setScreen(
            "clarification"
          );

          return true;
        }

        return false;

      } catch (error) {
        console.error(
          "Next contradiction error:",
          error
        );

        return false;
      }
    };


  // =========================
  // DETECT CONTRADICTIONS
  // =========================

  const detectContradictions = async () => {
    if (!sessionId) {
      alert(
        "Session not found."
      );

      return;
    }

    setDetectingContradictions(true);


    try {
      const response = await fetch(
        `${API_BASE}/session/${sessionId}/detect-contradictions`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to detect contradictions"
        );
      }

      const data =
        await response.json();

      const detectedContradictions =
        data.contradictions || [];

      setContradictions(
        detectedContradictions
      );


      // =========================
      // CONTRADICTION FOUND
      // =========================

      if (
        data.has_contradiction &&
        detectedContradictions.length > 0
      ) {
        const hasNext =
          await loadNextContradiction();

        if (!hasNext) {
          setScreen(
            "externalConsent"
          );
        }
      }

      else {
        // =========================
        // NO CONTRADICTIONS -> EXTERNAL EMR CONSENT
        // =========================

        setScreen(
          "externalConsent"
        );
      }

    } catch (error) {
      console.error(
        "Contradiction detection error:",
        error
      );

      alert(
        "Unable to detect contradictions."
      );

    } finally {
      setDetectingContradictions(false);
    }
  };


  // =========================
  // SUBMIT CLARIFICATION
  // =========================

  const submitClarification =
    async () => {

      if (
        !clarificationAnswer.trim()
      ) {
        alert(
          "Please provide your clarification."
        );

        return;
      }

      if (!currentContradiction) {
        return;
      }

      setClarificationLoading(
        true
      );


      try {
        const contradictionId =
          currentContradiction.id;

        const response = await fetch(
          `${API_BASE}/contradiction/${contradictionId}/clarify`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              answer:
                clarificationAnswer,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            "Unable to process clarification"
          );
        }

        const data =
          await response.json();


        // =========================
        // MORE CLARIFICATION NEEDED
        // =========================

        if (
          data.status === "continue"
        ) {
          setCurrentContradiction(
            (previous) => ({
              ...previous,

              clarification_question:
                data.question ||
                previous.clarification_question,
            })
          );

          setClarificationAnswer("");

          return;
        }


        // =========================
        // CONTRADICTION RESOLVED
        // =========================

        if (
          data.status === "resolved"
        ) {
          setContradictions(
            (previous) =>
              previous.map(
                (contradiction) => {

                  if (
                    contradiction.id ===
                    contradictionId
                  ) {
                    return {
                      ...contradiction,

                      patient_answer:
                        clarificationAnswer,

                      resolution_summary:
                        data.final_value,

                      status:
                        "resolved",
                    };
                  }

                  return contradiction;
                }
              )
          );

          setClarificationAnswer("");

          setCurrentContradiction(
            null
          );


          // =========================
          // CHECK NEXT CONTRADICTION
          // =========================

          const hasNext =
            await loadNextContradiction();

          // =========================
          // ALL CONTRADICTIONS DONE -> EXTERNAL EMR CONSENT
          // =========================

          if (!hasNext) {
            setScreen(
              "externalConsent"
            );
          }
        }

      } catch (error) {
        console.error(
          "Clarification error:",
          error
        );

        alert(
          "Unable to process clarification."
        );

      } finally {
        setClarificationLoading(
          false
        );
      }
    };


  // =========================
  // GENERATE FINAL REPORT
  // =========================

  const generateFinalReport =
    async () => {

      if (!sessionId) {
        return;
      }

      setFinalReportLoading(
        true
      );


      try {
        const response = await fetch(
          `${API_BASE}/session/${sessionId}/final-report`
        );

        if (!response.ok) {
          throw new Error(
            "Unable to generate final report"
          );
        }

        const data =
          await response.json();

        if (
          data.final_report
        ) {
          setFinalReport(
            data.final_report
          );
        }

        else {
          setFinalReport(
            "Unable to generate the final report."
          );
        }


        if (data.otp_code) {
          setSessionOtpInfo({
            otp_code: data.otp_code,
            doctor_name: data.doctor_name || consultationInfo.doctorName,
            department: data.department || consultationInfo.department,
            room: data.room || "OPD Room 105",
            status: data.queue_status || "ready_for_opd",
          });
        }

        // Get latest contradiction
        // data from backend

        if (
          data.contradictions
        ) {
          setContradictions(
            data.contradictions
          );
        }

      } catch (error) {
        console.error(
          "Final report error:",
          error
        );

        setFinalReport(
          "Unable to generate the final report."
        );

      } finally {
        setFinalReportLoading(
          false
        );
      }
    };


  // =========================
  // START NEW PATIENT
  // =========================

  const startNewPatient = () => {
    setScreen("welcome");

    setSessionId(null);

    setMessages([]);

    setInterviewStatus(
      "continue"
    );

    setSummary("");

    setSelectedFiles([]);

    setUploadResults([]);

    setContradictions([]);

    setCurrentContradiction(null);

    setClarificationAnswer("");

    setFinalReport("");

    setUserInput("");

    setSelectedLanguage(null);

    setSessionOtpInfo(null);
  };


  // =========================
  // STAFF PORTAL RENDER
  // =========================

  if (activePortal === "staff") {
    return (
      <div className="portal-page-container">
        <PortalHeader
          activePortal={activePortal}
          setActivePortal={setActivePortal}
          currentPatient={currentPatient}
          currentDoctor={currentDoctor}
          currentStaff={currentStaff}
          onLogout={handleLogout}
          onDoctorLogout={handleDoctorLogout}
          onStaffLogout={handleStaffLogout}
          onNewConsultation={startNewPatient}
          hasActiveSession={Boolean(sessionId)}
        />
        <main className="portal-main-content">
          <StaffPortal
            apiBase={API_BASE}
            currentStaff={currentStaff}
            onStaffLogin={handleStaffLogin}
            onStaffLogout={handleStaffLogout}
            onSwitchToPatient={() => setActivePortal("patient")}
          />
        </main>
      </div>
    );
  }

  // =========================
  // DOCTOR PORTAL RENDER
  // =========================

  if (activePortal === "doctor") {
    return (
      <div className="portal-page-container">
        <PortalHeader
          activePortal={activePortal}
          setActivePortal={setActivePortal}
          currentPatient={currentPatient}
          currentDoctor={currentDoctor}
          currentStaff={currentStaff}
          onLogout={handleLogout}
          onDoctorLogout={handleDoctorLogout}
          onStaffLogout={handleStaffLogout}
          onNewConsultation={startNewPatient}
          hasActiveSession={Boolean(sessionId)}
        />
        <main className="portal-main-content">
          <DoctorPortal
            apiBase={API_BASE}
            currentDoctor={currentDoctor}
            onDoctorLogin={handleDoctorLogin}
            onDoctorLogout={handleDoctorLogout}
            onSwitchToPatient={() => setActivePortal("patient")}
          />
        </main>
      </div>
    );
  }


  // =========================
  // PATIENT NOT LOGGED IN
  // =========================

  if (!currentPatient) {
    return (
      <div className="portal-page-container">
        <PortalHeader
          activePortal={activePortal}
          setActivePortal={setActivePortal}
          currentPatient={null}
          currentDoctor={currentDoctor}
          currentStaff={currentStaff}
          onLogout={handleLogout}
          onDoctorLogout={handleDoctorLogout}
          onStaffLogout={handleStaffLogout}
          onNewConsultation={startNewPatient}
          hasActiveSession={false}
        />
        <main className="portal-main-content">
          <LandingShowcase>
            <PatientAuth
              onLoginSuccess={handleLoginSuccess}
              apiBase={API_BASE}
            />
          </LandingShowcase>
        </main>
      </div>
    );
  }

  // =========================
  // HOSPITAL SELECTION SCREEN (NEW FLOW: Login -> Select Hospital -> Doctor flow)
  // =========================

  if (screen === "hospitalSelect") {
    return (
      <div className="portal-page-container">
        <PortalHeader
          activePortal={activePortal}
          currentPatient={currentPatient}
          currentDoctor={currentDoctor}
          currentStaff={currentStaff}
          onLogout={handleLogout}
          onDoctorLogout={handleDoctorLogout}
          onStaffLogout={handleStaffLogout}
          onNewConsultation={startNewPatient}
          hasActiveSession={Boolean(sessionId)}
        />
        <main className="portal-main-content">
          <HospitalSelector
            apiBase={API_BASE}
            currentHospital={selectedHospital}
            onSelectHospital={handleHospitalSelected}
          />
        </main>
      </div>
    );
  }

  // =========================
  // WELCOME & DOCTOR SELECTION SCREEN
  // =========================

  if (screen === "welcome") {
    return (
      <div className="portal-page-container">
        <PortalHeader
          activePortal={activePortal}
          currentPatient={currentPatient}
          currentDoctor={currentDoctor}
          currentStaff={currentStaff}
          onLogout={handleLogout}
          onDoctorLogout={handleDoctorLogout}
          onStaffLogout={handleStaffLogout}
          onNewConsultation={startNewPatient}
          hasActiveSession={Boolean(sessionId)}
        />
        <main className="portal-main-content">
          <PatientWelcome
            patient={currentPatient}
            apiBase={API_BASE}
            onProceed={handleProceedFromWelcome}
          />
        </main>
      </div>
    );
  }


  // =========================
  // LANGUAGE SCREEN
  // =========================

  if (
    screen === "language"
  ) {
    return (
      <div className="portal-page-container">
        <PortalHeader
          activePortal={activePortal}
          setActivePortal={setActivePortal}
          currentPatient={currentPatient}
          currentDoctor={currentDoctor}
          onLogout={handleLogout}
          onDoctorLogout={handleDoctorLogout}
          onNewConsultation={startNewPatient}
          hasActiveSession={Boolean(sessionId)}
        />
        <main className="portal-main-content app">
          <div className="language-card">

          <div className="logo">
            🏥
          </div>

          <h1>
            MediKiosk
          </h1>

          <p className="subtitle">
            AI-Assisted Patient History & Clinical Intelligence
          </p>

          <div className="divider"></div>

          <h2>
            Select Your Preferred Language
          </h2>

          <p className="instruction">
            Choose the language you are most comfortable with
          </p>

          {loading ? (

            <p>
              Loading languages...
            </p>

          ) : (

            <div className="language-list">

              {languages.map(
                (language) => (

                  <button
                    key={language.code}

                    className={`language-button ${
                      selectedLanguage?.code ===
                      language.code
                        ? "selected"
                        : ""
                    }`}

                    onClick={() =>
                      setSelectedLanguage(
                        language
                      )
                    }
                  >

                    <span className="language-native">
                      {language.native_name}
                    </span>

                    <span className="language-name">
                      {language.name}
                    </span>

                  </button>

                )
              )}

            </div>
          )}

          <button
            className="continue-button"
            onClick={handleContinue}
          >
            Continue →
          </button>

        </div>

        </main>

      </div>
    );
  }


  // =========================
  // SUMMARY SCREEN
  // =========================

  if (
    screen === "summary"
  ) {
    return (
      <div className="portal-page-container">
        <PortalHeader
          activePortal={activePortal}
          setActivePortal={setActivePortal}
          currentPatient={currentPatient}
          currentDoctor={currentDoctor}
          onLogout={handleLogout}
          onDoctorLogout={handleDoctorLogout}
          onNewConsultation={startNewPatient}
          hasActiveSession={Boolean(sessionId)}
        />
        <main className="portal-main-content app">
          <div className="summary-container">

          <div className="summary-header">

            <h1>
              🏥 MediKiosk
            </h1>

            <p>
              Patient Interview Summary
            </p>

          </div>


          {interviewStatus ===
            "red_flag" && (

            <div className="red-flag-summary">

              <strong>
                ⚠ Immediate Medical Attention Recommended
              </strong>

              <p>
                Please contact medical staff or seek
                emergency medical attention immediately.
              </p>

            </div>
          )}


          <div className="summary-card">

            {summaryLoading ? (

              <p className="summary-loading">
                Preparing your interview summary...
              </p>

            ) : (

              <div className="summary-content">

                {summary
                  .split("###")
                  .filter(
                    (section) =>
                      section.trim() !== ""
                  )
                  .map(
                    (section, index) => {

                      const lines =
                        section
                          .trim()
                          .split("\n");

                      const title =
                        lines[0].trim();

                      const content =
                        lines
                          .slice(1)
                          .join("\n")
                          .trim();

                      const contentLines =
                        content
                          .split("\n")
                          .filter(
                            (line) =>
                              line.trim() !== ""
                          );

                      const hasBullets =
                        contentLines.some(
                          (line) =>
                            line.trim()
                              .startsWith("•") ||
                            line.trim()
                              .startsWith("-")
                        );

                      return (
                        <div
                          className="summary-section"
                          key={index}
                        >

                          <h2>
                            {title}
                          </h2>

                          {hasBullets ? (

                            <ul>

                              {contentLines.map(
                                (line, i) => (

                                  <li key={i}>
                                    {line
                                      .replace(/^•/, "")
                                      .replace(/^-/, "")
                                      .trim()}
                                  </li>

                                )
                              )}

                            </ul>

                          ) : (

                            <p>
                              {content}
                            </p>

                          )}

                        </div>
                      );
                    }
                  )}

              </div>

            )}

          </div>


          <button
            className="continue-button"
            onClick={() =>
              setScreen(
                "documents"
              )
            }
          >
            Continue to Document Upload (Optional) →
          </button>

        </div>

        </main>

      </div>
    );
  }


  // =========================
  // DOCUMENT UPLOAD SCREEN
  // =========================

  if (
    screen === "documents"
  ) {
    return (
      <div className="portal-page-container">
        <PortalHeader
          activePortal={activePortal}
          setActivePortal={setActivePortal}
          currentPatient={currentPatient}
          currentDoctor={currentDoctor}
          onLogout={handleLogout}
          onDoctorLogout={handleDoctorLogout}
          onNewConsultation={startNewPatient}
          hasActiveSession={Boolean(sessionId)}
        />
        <main className="portal-main-content app">
          <div className="language-card document-card">

          <div className="logo">
            📄
          </div>

          <div>
            <span className="optional-badge">Optional Step</span>
          </div>

          <h1>
            Upload Medical Documents
          </h1>

          <p className="subtitle">
            Upload prescriptions, lab reports, or prior medical documents if available. You can also skip this step and proceed directly to your summary.
          </p>

          <div className="divider"></div>


          <div className="upload-area">

            <input
              type="file"

              id="document-upload"

              accept=".jpg,.jpeg,.png"

              multiple

              onChange={(event) => {

                const files =
                  Array.from(
                    event.target.files
                  );

                setSelectedFiles(
                  files
                );

                setUploadResults([]);
              }}
            />

            <label
              htmlFor="document-upload"
              className="upload-label"
            >
              📁 Choose Medical Documents
            </label>

            <p className="upload-info">
              Supported formats:
              JPG, JPEG, PNG
            </p>

          </div>


          {selectedFiles.length > 0 && (

            <div className="selected-files">

              <h3>
                Selected Documents ({selectedFiles.length})
              </h3>

              {selectedFiles.map(
                (file, index) => (

                  <div
                    className="file-item"
                    key={index}
                  >
                    📄 {file.name}
                  </div>

                )
              )}

            </div>

          )}

          <div className="document-actions">
            {selectedFiles.length > 0 ? (
              <button
                className="continue-button"
                disabled={uploading}
                onClick={uploadDocuments}
                style={{ marginTop: 0 }}
              >
                {uploading
                  ? "Uploading & Reading Documents..."
                  : "Upload Selected Documents →"
                }
              </button>
            ) : null}

            <button
              type="button"
              className="skip-button"
              disabled={uploading || detectingContradictions}
              onClick={() => {
                detectContradictions();
              }}
            >
              {selectedFiles.length > 0
                ? "Skip Upload & Proceed to Analysis →"
                : "Proceed Without Uploading (Skip) →"
              }
            </button>
          </div>


          {uploadResults.length > 0 && (

            <>

              <div className="selected-files">

                <h3>
                  Extracted Document Text
                </h3>

                {uploadResults.map(
                  (result, index) => (

                    <div
                      key={index}
                      className="summary-section"
                    >

                      <h3>
                        📄 {result.filename}
                      </h3>

                      {result.extracted_text?.success ? (

                        <p
                          style={{
                            whiteSpace:
                              "pre-wrap",
                          }}
                        >
                          {
                            result
                              .extracted_text
                              .text ||
                            "No text detected in this document."
                          }
                        </p>

                      ) : (

                        <p>
                          ❌ OCR failed: {
                            result
                              .extracted_text
                              ?.error ||
                            "Unknown error"
                          }
                        </p>

                      )}

                    </div>

                  )
                )}

              </div>


              <button
                className="continue-button"

                onClick={
                  detectContradictions
                }

                disabled={
                  detectingContradictions
                }
              >

                {detectingContradictions
                  ? "Analyzing Clinical Information..."
                  : "Analyze Contradictions →"
                }

              </button>

            </>

          )}

        </div>

        </main>

      </div>
    );
  }


  // =========================
  // CLARIFICATION SCREEN
  // =========================

  if (
    screen === "clarification"
  ) {
    return (
      <div className="portal-page-container">
        <PortalHeader
          activePortal={activePortal}
          setActivePortal={setActivePortal}
          currentPatient={currentPatient}
          currentDoctor={currentDoctor}
          onLogout={handleLogout}
          onDoctorLogout={handleDoctorLogout}
          onNewConsultation={startNewPatient}
          hasActiveSession={Boolean(sessionId)}
        />
        <main className="portal-main-content app">
          <div className="summary-container">

          <div className="summary-header">

            <h1>
              🔍 MediKiosk
            </h1>

            <p>
              Clinical Information Clarification
            </p>

          </div>


          <div className="summary-card">

            <div className="summary-section">

              <h2>
                Possible Information Mismatch
              </h2>

              <p>
                We found a difference between the
                information provided during the interview
                and the uploaded medical document.
              </p>

            </div>


            <div className="summary-section">

              <h3>
                Topic
              </h3>

              <p>
                {
                  currentContradiction?.category
                }
              </p>

            </div>


            <div className="summary-section">

              <h3>
                Information from Interview
              </h3>

              <p>
                {
                  currentContradiction
                    ?.patient_statement
                }
              </p>

            </div>


            <div className="summary-section">

              <h3>
                Information from Document
              </h3>

              <p>
                {
                  currentContradiction
                    ?.document_evidence
                }
              </p>

            </div>


            <div className="summary-section">

              <h2>
                Please Clarify
              </h2>

              <p>
                {
                  currentContradiction
                    ?.clarification_question
                }
              </p>

            </div>


            {currentContradiction?.options
              ?.length > 0 && (

              <div className="summary-section">

                <h3>
                  Suggested Options
                </h3>

                <div className="language-list">

                  {currentContradiction.options.map(
                    (option, index) => (

                      <button
                        key={index}

                        type="button"

                        className={
                          `language-button ${
                            clarificationAnswer ===
                            option
                              ? "selected"
                              : ""
                          }`
                        }

                        onClick={() =>
                          setClarificationAnswer(
                            option
                          )
                        }
                      >
                        {option}
                      </button>

                    )
                  )}

                </div>

              </div>

            )}


            <textarea
              value={
                clarificationAnswer
              }

              onChange={(event) =>
                setClarificationAnswer(
                  event.target.value
                )
              }

              placeholder="Please provide clarification..."

              rows="4"

              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                marginTop: "10px",
                boxSizing: "border-box",
              }}
            />


            <button
              className="continue-button"

              onClick={
                submitClarification
              }

              disabled={
                clarificationLoading
              }
            >

              {clarificationLoading
                ? "Processing Clarification..."
                : "Submit Clarification →"
              }

            </button>

          </div>

        </div>

        </main>

      </div>
    );
  }


  // =========================
  // EXTERNAL EMR CONSENT SCREEN
  // =========================

  if (screen === "externalConsent") {
    return (
      <div className="portal-page-container">
        <PortalHeader
          activePortal={activePortal}
          setActivePortal={setActivePortal}
          currentPatient={currentPatient}
          currentDoctor={currentDoctor}
          currentStaff={currentStaff}
          onLogout={handleLogout}
          onDoctorLogout={handleDoctorLogout}
          onStaffLogout={handleStaffLogout}
          onNewConsultation={startNewPatient}
          hasActiveSession={Boolean(sessionId)}
        />
        <main className="portal-main-content app">
          <ExternalEMRConsent
            apiBase={API_BASE}
            sessionId={sessionId}
            patientName={currentPatient?.full_name}
            currentHospitalName={selectedHospital?.name || "MediKiosk General Hospital"}
            onConsentDecision={(result) => {
              setExternalConsentData(result.external_data);
              setScreen("finalReport");
              generateFinalReport();
            }}
          />
        </main>
      </div>
    );
  }


  // =========================
  // FINAL REPORT SCREEN
  // =========================

  if (
    screen === "finalReport"
  ) {
    return (
      <div className="portal-page-container">
        <PortalHeader
          activePortal={activePortal}
          setActivePortal={setActivePortal}
          currentPatient={currentPatient}
          currentDoctor={currentDoctor}
          onLogout={handleLogout}
          onDoctorLogout={handleDoctorLogout}
          onNewConsultation={startNewPatient}
          hasActiveSession={Boolean(sessionId)}
        />
        <main className="portal-main-content app">
          <div className="summary-container">

          <div className="summary-header">

            <h1>
              🏥 MediKiosk
            </h1>

            <p>
              Doctor-Ready Clinical Context
            </p>

          </div>


          {finalReportLoading ? (

            <div className="summary-card">

              <p className="summary-loading">
                Generating final clinical report...
              </p>

            </div>

          ) : (

            <div className="summary-card">

              <div className="summary-content">

                {finalReport
                  .split("###")

                  .filter(
                    (section) =>
                      section.trim() !== ""
                  )

                  .map(
                    (section, index) => {

                      const lines =
                        section
                          .trim()
                          .split("\n");

                      const title =
                        lines[0].trim();

                      const content =
                        lines
                          .slice(1)
                          .join("\n")
                          .trim();

                      const contentLines =
                        content
                          .split("\n")
                          .filter(
                            (line) =>
                              line.trim() !== ""
                          );

                      const hasBullets =
                        contentLines.some(
                          (line) =>
                            line.trim()
                              .startsWith("•") ||
                            line.trim()
                              .startsWith("-")
                        );

                      return (
                        <div
                          className="summary-section"
                          key={index}
                        >

                          <h2>
                            {title}
                          </h2>

                          {hasBullets ? (

                            <ul>

                              {contentLines.map(
                                (line, i) => (

                                  <li key={i}>
                                    {line
                                      .replace(/^•/, "")
                                      .replace(/^-/, "")
                                      .trim()}
                                  </li>

                                )
                              )}

                            </ul>

                          ) : (

                            <p
                              style={{
                                whiteSpace:
                                  "pre-wrap",
                              }}
                            >
                              {content}
                            </p>

                          )}

                        </div>
                      );
                    }
                  )}

              </div>


              {contradictions.length > 0 && (

                <div className="summary-section">

                  <h2>
                    🔍 Contradiction Resolution Details
                  </h2>

                  {contradictions.map(
                    (
                      contradiction,
                      index
                    ) => (

                      <div
                        key={index}
                        style={{
                          marginBottom:
                            "20px",
                        }}
                      >

                        <h3>
                          {
                            contradiction.category
                          }
                        </h3>

                        <p>
                          <strong>
                            Patient originally reported:
                          </strong>
                          {" "}
                          {
                            contradiction
                              .patient_statement
                          }
                        </p>

                        <p>
                          <strong>
                            Document showed:
                          </strong>
                          {" "}
                          {
                            contradiction
                              .document_evidence
                          }
                        </p>

                        <p>
                          <strong>
                            Clarification:
                          </strong>
                          {" "}
                          {
                            contradiction
                              .patient_answer ||
                            "Not available"
                          }
                        </p>

                        <p>
                          <strong>
                            Resolution Status:
                          </strong>
                          {" "}
                          {
                            contradiction.status
                          }
                        </p>

                        {contradiction
                          .resolution_summary && (

                          <p>
                            <strong>
                              Final Clarified Information:
                            </strong>
                            {" "}
                            {
                              contradiction
                                .resolution_summary
                            }
                          </p>

                        )}

                      </div>

                    )
                  )}

                </div>

              )}

              {/* Longitudinal Medical Timeline if Consented */}
              {externalConsentData?.timeline && externalConsentData.timeline.length > 0 && (
                <div className="summary-section">
                  <MedicalTimeline
                    timeline={externalConsentData.timeline}
                    currentHospital={selectedHospital?.name || "MediKiosk General Hospital"}
                  />
                </div>
              )}

            </div>

          )}


          {sessionOtpInfo && (
            <div className="opd-token-pass">
              <div className="opd-pass-header">
                <span className="opd-pass-icon">🏥</span>
                <div>
                  <div className="opd-pass-title">OPD CHECK-IN PASS</div>
                  <div className="opd-pass-subtitle">Present this to your assigned physician</div>
                </div>
                <span className="opd-ready-badge">✓ Ready for OPD</span>
              </div>

              <div className="opd-token-main">
                <div className="opd-token-label">Your 6-Digit OPD Token</div>
                <div className="opd-token-digits">{sessionOtpInfo.otp_code}</div>
              </div>

              <div className="opd-doctor-details">
                <div className="opd-detail-item">
                  <span className="opd-detail-icon">🩺</span>
                  <div>
                    <div className="opd-detail-label">Assigned Doctor</div>
                    <div className="opd-detail-value">{sessionOtpInfo.doctor_name}</div>
                  </div>
                </div>
                <div className="opd-detail-item">
                  <span className="opd-detail-icon">🏨</span>
                  <div>
                    <div className="opd-detail-label">Department</div>
                    <div className="opd-detail-value">{sessionOtpInfo.department}</div>
                  </div>
                </div>
                <div className="opd-detail-item">
                  <span className="opd-detail-icon">📍</span>
                  <div>
                    <div className="opd-detail-label">OPD Room</div>
                    <div className="opd-detail-value">{sessionOtpInfo.room}</div>
                  </div>
                </div>
              </div>

              <div className="opd-instructions">
                Proceed to <strong>{sessionOtpInfo.room}</strong> and share your token code{" "}
                <strong>{sessionOtpInfo.otp_code}</strong> with Dr.{" "}
                {sessionOtpInfo.doctor_name.replace(/^Dr\.\s*/i, "")} to begin your consultation.
              </div>
            </div>
          )}

          <button
            className="btn-end-consultation"
            onClick={handleEndConsultation}
          >
            ✓ End Consultation
          </button>

        </div>

        </main>

      </div>
    );
  }


  // =========================
  // INTERVIEW SCREEN
  // =========================

  return (
    <div className="portal-page-container">
      <PortalHeader
        activePortal={activePortal}
        setActivePortal={setActivePortal}
        currentPatient={currentPatient}
        currentDoctor={currentDoctor}
        onLogout={handleLogout}
        onDoctorLogout={handleDoctorLogout}
        onNewConsultation={startNewPatient}
        hasActiveSession={Boolean(sessionId)}
      />
      <main className="portal-main-content app">
        <div className="chat-container">

        <div className="chat-header">

          <div>

            <h1>
              🏥 MediKiosk
            </h1>

            <p>
              AI-Assisted Patient Interview
            </p>

          </div>

          <div className="header-indicators-group">

            {consultationInfo?.doctorName && (
              <div className="doctor-badge-chip">
                <span>🩺</span> {consultationInfo.doctorName}
                {consultationInfo.department && (
                  <span className="doc-dept-pill">{consultationInfo.department}</span>
                )}
              </div>
            )}

            <div className="language-indicator">

              {
                selectedLanguage?.native_name
              }

            </div>

          </div>

        </div>


        <div className="chat-messages">

          {messages.map(
            (message, index) => (

              <div
                key={index}

                className={
                  `message ${message.sender}`
                }
              >

                {message.sender ===
                  "ai" && (

                  <span className="message-label">
                    🤖 MediKiosk
                  </span>

                )}

                <div className="message-bubble">

                  {message.text}

                </div>

              </div>

            )
          )}


          {isSending && (

            <div className="message ai">

              <span className="message-label">
                🤖 MediKiosk
              </span>

              <div className="message-bubble">
                Thinking...
              </div>

            </div>

          )}

        </div>


        <div className="chat-input-area">

          <input
            type="text"

            placeholder={
              interviewStatus ===
                "continue"
                ? "Type your answer..."
                : "Interview has ended"
            }

            value={
              userInput
            }

            disabled={
              interviewStatus !==
                "continue" ||
              isSending
            }

            onChange={(event) =>
              setUserInput(
                event.target.value
              )
            }

            onKeyDown={(event) => {

              if (
                event.key ===
                  "Enter" &&

                interviewStatus ===
                  "continue" &&

                !isSending
              ) {
                sendMessage();
              }

            }}
          />


          <button
            className="mic-button"

            title="Voice input"

            onClick={
              startListening
            }

            disabled={
              interviewStatus !==
                "continue" ||

              isListening ||

              isSending
            }
          >

            {isListening
              ? "🎙️"
              : "🎤"
            }

          </button>


          <button
            className="send-button"

            onClick={
              sendMessage
            }

            disabled={
              interviewStatus !==
                "continue" ||

              isSending
            }
          >

            {isSending
              ? "..."
              : "Send ➤"
            }

          </button>

        </div>

      </div>

      </main>

    </div>
  );
}

export default App;
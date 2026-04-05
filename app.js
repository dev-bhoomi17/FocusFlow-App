const firebaseConfig = {
    apiKey: "AIzaSyCASp7Ky_hLkN82Fd7p7oeo_ZMZ7o7kxWA",
    authDomain: "focusflow-app-f2aae.firebaseapp.com",
    projectId: "focusflow-app-f2aae",
    storageBucket: "focusflow-app-f2aae.firebasestorage.app",
    messagingSenderId: "365335751542",
    appId: "1:365335751542:web:e9f32cafe3a28d1400e857",
    measurementId: "G-X3G17KMTR5"
};

// 3. This starts the connection
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
// --- Place this at the top level of your script (near line 65) ---

const { useState, useMemo, useEffect } = React;

const App = () => {
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLogin, setIsLogin] = useState(true);
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                setDailyTasks([]);
                setDiaryEntries([]);
                setJourneys([]);
                setProfile({ name: "FocusFlow User" });

                setView("dashboard");
            } else {
                setUser(null);
                setDailyTasks([]);
                setDiaryEntries([]);
                setJourneys([]);
            }
        });

        return () => unsubscribe();
    }, []);
    const [view, setView] = useState('activity');
    const [activeTab, setActiveTab] = useState('todo');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [hideCompleted, setHideCompleted] = useState(false);
    const [taskMode, setTaskMode] = useState('task');

    // Achievement Diary States
    const [diaryEntries, setDiaryEntries] = useState([]);
    useEffect(() => {
        if (!user) return; // ✅ wait for login

        const unsubscribe = db.collection("diary")
            .where("uid", "==", user?.uid)
            .orderBy("createdAt", "desc")
            .onSnapshot((snapshot) => {
                const entries = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setDiaryEntries(entries);
            });
    }, [user]);
    const [newEntry, setNewEntry] = useState({ text: "", start: "", end: "", photo: null });
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState("");

    const [dailyTasks, setDailyTasks] = useState([]);


    const [profileId, setProfileId] = useState(null);
    useEffect(() => {
        if (!user) return; // 🔥 ADD THIS

        const unsubscribe = db.collection("profile")
            .where("uid", "==", user.uid)
            .onSnapshot((snapshot) => {
                if (!snapshot.empty) {
                    const docSnap = snapshot.docs[0];
                    setProfileId(docSnap.id);
                    setProfile(docSnap.data());
                }
            });

        return () => unsubscribe();
    }, [user]);
    const [profile, setProfile] = useState({
        name: "FocusFlow User"
    });


    const [journeys, setJourneys] = useState([]);
    const weeklyData = useMemo(() => {
        console.log("JOURNEYS:", journeys);

        const data = [0, 0, 0, 0, 0, 0, 0];

        if (!journeys) return data;

        journeys.forEach(j => {
            (j.tasks || []).forEach(t => {

                if (t.done) {
                    const today = new Date().getDay();
                    const index = today === 0 ? 6 : today - 1;
                    data[index] += 1;
                }

                (t.subTasks || []).forEach(s => {
                    if (s.done) {
                        const today = new Date().getDay();
                        const index = today === 0 ? 6 : today - 1;
                        data[index] += 1;
                    }
                });

            });
        });

        return data;

    }, [journeys]);

    useEffect(() => {
        if (!user) return;

        const unsubscribe = db.collection("journeys")
            .where("uid", "==", user.uid)
            .orderBy("createdAt", "desc")
            .onSnapshot((snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setJourneys(data);
            });

        return () => unsubscribe();
    }, [user]);
    // --- INSERT THE LISTENER HERE ---
    useEffect(() => {
        if (!user) return; // ✅ wait until user is logged in

        const unsubscribe = db.collection("tasks")
            .where("uid", "==", user?.uid)
            .orderBy("createdAt", "desc")
            .onSnapshot((snapshot) => {
                const firebaseTasks = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setDailyTasks(firebaseTasks);
            });

        return () => unsubscribe();
    }, [user]);
    // --- END OF LISTENER ---

    const [aiSummary, setAiSummary] = useState("");
    const [todoInput, setTodoInput] = useState("");
    const [aiInput, setAiInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [openHelp, setOpenHelp] = useState(null);
    const [openJourneyId, setOpenJourneyId] = useState(null);
    const [chatMessages, setChatMessages] = useState([{ type: 'ai', text: "Ready to analyze your growth?" }]);


    const handleAuth = async () => {
        try {
            if (isLogin) {
                // LOGIN
                await auth.signInWithEmailAndPassword(email, password);
            } else {
                // SIGNUP
                const userCred = await auth.createUserWithEmailAndPassword(email, password);

                // SAVE USER IN FIRESTORE
                await db.collection("users").add({
                    uid: userCred.user?.uid,
                    email: userCred.user.email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const handleGoogleLogin = async () => {
        const provider = new firebase.auth.GoogleAuthProvider();

        try {
            await auth.signInWithPopup(provider);
        } catch (error) {
            alert(error.message);
        }
    };

    const handleLogout = async () => {
        try {
            await auth.signOut();
            setUser(null);
        } catch (err) {
            console.error("Logout error:", err);
        }
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setNewEntry({ ...newEntry, photo: reader.result });
            reader.readAsDataURL(file);
        }
    };

    const saveAchievement = async () => {
        if (!user) return;
        if (!newEntry.text.trim()) return;

        try {
            await db.collection("diary").add({
                text: newEntry.text,
                start: newEntry.start,
                end: newEntry.end,
                photo: newEntry.photo || "",
                uid: user?.uid, // ✅ ADD THIS
                createdAt: new Date()
            });

            setNewEntry({ text: "", start: "", end: "", photo: null });

        } catch (error) {
            console.error("Error saving diary:", error);
        }
    };
    const deleteDiary = async (id) => {
        try {
            await db.collection("diary").doc(id).delete();
        } catch (err) {
            console.error("Delete error:", err);
        }
    };
    const updateDiary = async (id) => {
        try {
            await db.collection("diary").doc(id).update({
                text: editText
            });
            setEditingId(null);
        } catch (err) {
            console.error("Update error:", err);
        }
    };
    const stats = useMemo(() => {

        let total = dailyTasks?.length || 0;
        let done = dailyTasks?.filter(x => x.done).length || 0;

        journeys?.forEach(j => {
            const tasks = j.tasks || [];

            total += tasks.length;
            done += tasks.filter(t => t.done).length;

            tasks.forEach(t => {
                const subs = t.subTasks || [];
                total += subs.length;
                done += subs.filter(s => s.done).length;
            });
        });

        return {
            pct: total > 0 ? Math.round((done / total) * 100) : 0,
            done,
            total,
            streaksCount: dailyTasks?.filter(x => x.type === 'streaks')
                .reduce((acc, curr) => acc + (curr.count || 0), 0) || 0
        };

    }, [dailyTasks, journeys]);

    useEffect(() => {
        if (view === 'dashboard') {
            const ctx = document.getElementById('progressChart');
            if (ctx) {
                const chart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Routine', 'Journeys', 'Overall'],
                        datasets: [{
                            label: 'Completion %',
                            data: [
                                dailyTasks?.length ? Math.round((dailyTasks.filter(x => x.done).length / dailyTasks.length) * 100) : 0,
                                journeys?.length ? Math.round((journeys.reduce((acc, j) => acc + (j.tasks?.filter(t => t.done).length / j.tasks?.length || 0), 0) / journeys.length) * 100) : 0,
                                stats.pct
                            ],

                            backgroundColor: ['#66C5CC', '#F89C74', '#F6CF71'],
                            borderRadius: 12
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, max: 100, grid: { color: '#2a2a2a' }, ticks: { color: '#B3B3B3' } },
                            x: { grid: { display: false }, ticks: { color: '#B3B3B3' } }
                        }
                    }
                });
                return () => chart.destroy();
            }
        }
    }, [view, dailyTasks, journeys, stats]);
    useEffect(() => {
        if (view !== "profile") return;

        const ctx = document.getElementById("weeklyChart");
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: "line",
            data: {
                labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                datasets: [{
                    data: weeklyData,
                    borderColor: "#66C5CC",
                    tension: 0.4
                }]
            },
            options: {
                plugins: { legend: { display: false } }
            }
        });

        return () => chart.destroy();
    }, [view, weeklyData]);

    const badges = useMemo(() => {
        let b = [];

        if (stats.done >= 5) b.push({ name: "Starter", icon: "🌱", color: "from-green-400 to-emerald-600" });
        if (stats.done >= 20) b.push({ name: "Builder", icon: "🧱", color: "from-blue-400 to-cyan-500" });
        if (stats.done >= 50) b.push({ name: "Grinder", icon: "⚡", color: "from-purple-500 to-pink-500" });
        if (stats.pct >= 80) b.push({ name: "Focused", icon: "🔥", color: "from-orange-400 to-red-500" });
        if (stats.streaksCount >= 5) b.push({ name: "Consistent", icon: "📅", color: "from-yellow-400 to-orange-500" });

        return b;
    }, [stats]);



    const deleteTask = async (taskId) => {
        try {
            // 1. Delete from Firebase Database
            db.collection("tasks").doc(taskId).delete()

            // 2. Update the screen (UI) so the task disappears instantly
            setDailyTasks(prev => prev.filter(task => task.id !== taskId));

            console.log("Task deleted successfully!");
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    // 2. Now your addDailyItem stands alone
    const addDailyItem = async () => {
        if (!user) return;
        if (!todoInput.trim()) return;

        try {
            await db.collection("tasks").add({
                text: todoInput,
                done: false,
                type: taskMode,
                count: 0,
                uid: user?.uid, // ✅ IMPORTANT
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            setTodoInput("");
            console.log("Task saved to Firebase!");
        } catch (error) {
            console.error("Error adding task: ", error);
        }
    };

    const toggleDailyDone = async (id) => {
        const task = dailyTasks.find(t => t.id === id);
        if (!task) return;

        try {
            const taskRef = db.collection("tasks").doc(id);
            const isCompleting = !task.done; // Checking the box

            await taskRef.update({
                done: isCompleting,
                count: (task.type === 'streaks' && isCompleting)
                    ? (task.count || 0) + 1
                    : (task.count || 0)
            });
        } catch (e) {
            console.error("Error updating task:", e);
        }
    };
    const generateJourneySteps = async (topic) => {
        try {
            const res = await fetch("/api/ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message: topic }) // ✅ FIXED
            });

            const data = await res.json();

            console.log("FULL AI RESPONSE:", data);
            alert(JSON.stringify(data));

            const aiText = data?.choices?.[0]?.message?.content;

            if (!aiText) {
                throw new Error("No AI response");
            }

            console.log("AI TEXT:", aiText);

            // 🔥 CLEAN + FLEXIBLE PARSING
            let cleanText = aiText.replace(/```json|```/g, "").trim();

            try {
                // ✅ Try JSON format first
                const parsed = JSON.parse(cleanText);

                return parsed.map(step => ({
                    title: step.title || step,
                    subtasks: step.subtasks || [],
                    resource: step.resource && step.resource.startsWith("http")
                        ? step.resource
                        : `https://www.youtube.com/results?search_query=${step.title} tutorial`
                }));

            } catch (e) {
                console.warn("AI returned plain text, converting...");

                // ✅ Fallback: convert text → structured steps
                return cleanText
                    .split("\n")
                    .filter(line => line.trim() !== "")
                    .map(line => ({
                        title: line.replace(/^Step\s*\d+:\s*/i, "").trim(),
                        subtasks: [],
                        resource: ""
                    }));
            }

        } catch (error) {
            console.error("AI failed, using backup:", error);

            return [
                {
                    title: "Fundamentals of " + topic,
                    subtasks: ["Learn basics", "Practice examples"],
                    resource: ""
                },
                {
                    title: "Intermediate Practice",
                    subtasks: ["Build small projects"],
                    resource: ""
                }
            ];
        }
    };

    const sendChatToAI = async (message) => {
        try {
            const res = await fetch("/api/ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: message
                })
            });

            const data = await res.json();
            return data.choices?.[0]?.message?.content || "No response";
        } catch (err) {
            console.error(err);
            return "Error ⚠️";
        }
    };
    const addJourney = async () => {
        if (!user || !aiInput.trim()) return;

        setLoading(true);

        let steps = await generateJourneySteps(aiInput);

        const formattedTasks = steps.map((step, index) => ({
            id: Date.now() + index,
            text: step.title,
            done: false,
            subTasks: (step.subtasks || []).map((s, i) => ({
                id: Date.now() + index + i,
                text: s,
                done: false
            })),
            resource: step.resource || ""
        }));

        await db.collection("journeys").add({
            title: aiInput,
            tasks: formattedTasks,
            uid: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        setAiInput("");
        setLoading(false);
    };
    // 🔥 ADD HERE

    const updateProgress = async (id, newProgress) => {
        await db.collection("journeys").doc(id).update({
            progress: newProgress
        });
    };

    const generateSummary = async () => {
        const prompt = `
    Tasks done: ${stats.done}
    Completion: ${stats.pct}%
    Streak: ${stats.streaksCount}

    Write 2 lines personality summary motivational.
    `;

        try {
            const res = await fetch("/api/ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: prompt
                })
            });

            const data = await res.json();

            const aiResponse = data.choices[0].message.content;

            setAiSummary(aiResponse);

            // 🔥 ADD THIS PART
            await db.collection("ai_logs").add({
                uid: user.uid,
                input: prompt,
                response: aiResponse,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        } catch (e) {
            console.error(e);
        }
    };



    const toggleAllInJourney = (jId) => {
        setJourneys(journeys.map(j => {
            if (j.id === jId) {
                const allDone = (j.tasks || []).every(t => t.done);
                return { ...j, tasks: (j.tasks || []).map(t => ({ ...t, done: !allDone })) };
            }
            return j;
        }));
    };
    const addSubTask = (journeyId, taskId, text) => {
        setJourneys(prev =>
            prev.map(j => {
                if (j.id === journeyId) {
                    return {
                        ...j,
                        tasks: (j.tasks || []).map(t => {
                            if (t.id === taskId) {
                                return {
                                    ...t,
                                    subTasks: [
                                        ...(t.subTasks || []),
                                        { id: Date.now(), text, done: false }
                                    ]
                                };
                            }
                            return t;
                        })
                    };
                }
                return j;
            })
        );
    };

    const addTaskToJourney = (journeyId, text) => {
        if (!text.trim()) return;
        setJourneys(prev =>
            prev.map(j =>
                j.id === journeyId
                    ? { ...j, tasks: [...(j.tasks || []), { id: Date.now(), text, done: false }] }
                    : j
            )
        );
    };
    const saveProfileToFirebase = async (newProfile) => {
        if (!user) return;
        try {
            if (profileId) {
                db.collection("profile").doc(profileId).update({
                    ...newProfile,
                    uid: user?.uid
                });
            } else {
                const docRef = await db.collection("profile").add({
                    ...newProfile,
                    uid: user?.uid
                });
                setProfileId(docRef.id);
            }
        } catch (e) {
            console.error("Profile save error:", e);
        }
    };
    const NavItem = ({ icon, label, active, onClick, expanded }) => (
        <div onClick={onClick} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all ${active ? 'bg-[#2a2a2a] text-[#66C5CC]' : 'text-[#B3B3B3] hover:bg-[#222]'}`}>
            <span className="text-xl">{icon}</span>
            {expanded && <span className="font-bold text-sm tracking-tight">{label}</span>}
        </div>
    );

    if (!user) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#121212] text-white">
                <div className="bg-[#1e1e1e] p-10 rounded-3xl border border-[#2a2a2a] w-80">

                    <h2 className="text-2xl font-bold mb-6 text-center">
                        {isLogin ? "Login" : "Sign Up"}
                    </h2>

                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 mb-4 bg-black/20 rounded-xl"
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 mb-4 bg-black/20 rounded-xl"
                    />
                    <button onClick={handleGoogleLogin}>
                        Login with Google 🚀
                    </button>

                    <button
                        onClick={handleAuth}
                        className="w-full py-3 bg-[#66C5CC] text-black font-bold rounded-xl"
                    >
                        {isLogin ? "Login" : "Create Account"}
                    </button>

                    <p
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-center mt-4 cursor-pointer text-[#B3B3B3]"
                    >
                        {isLogin ? "Create account?" : "Already have account?"}
                    </p>


                </div>
            </div>
        );
    }


    return (
        <div className="flex h-screen w-full relative">
            <aside className={`h-full bg-[#181818] border-r border-[#2a2a2a] flex flex-col z-50 transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'}`}>
                <div onClick={() => setIsExpanded(!isExpanded)} className="p-6 cursor-pointer flex items-center gap-4 border-b border-[#2a2a2a]">
                    <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[#121212] font-black" style={{ backgroundColor: '#66C5CC' }}>FF</div>
                    {isExpanded && <span className="font-extrabold text-xl tracking-tighter" style={{ color: '#66C5CC' }}>FOCUSFLOW</span>}
                </div>
                <nav className="flex-1 mt-8 px-3 space-y-2">
                    <NavItem icon="📋" label="Activity" active={view === 'activity'} onClick={() => setView('activity')} expanded={isExpanded} />
                    <NavItem icon="📊" label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} expanded={isExpanded} />
                    <NavItem icon="📔" label="Diary" active={view === 'diary'} onClick={() => setView('diary')} expanded={isExpanded} />
                    <NavItem icon="👤" label="Profile" active={view === 'profile'} onClick={() => setView('profile')} expanded={isExpanded} />
                    <NavItem icon="❓" label="Help" active={view === 'help'} onClick={() => setView('help')} expanded={isExpanded} />
                    <NavItem icon="ℹ️" label="About" active={view === 'about'} onClick={() => setView('about')} expanded={isExpanded} />
                </nav>
            </aside>

            <div className="fixed top-0 left-0 right-0 h-16 bg-[#181818] border-b border-[#2a2a2a] flex items-center justify-between px-6 z-50">

                {/* LEFT SIDE */}
                <h1 className="text-lg font-bold text-[#66C5CC]">FocusFlow</h1>

                {/* RIGHT SIDE */}
                <div className="flex items-center gap-4">

                    {/* USER NAME */}
                    <span className="text-sm text-white font-semibold">
                        {profile?.name || user?.email}
                    </span>

                    {/* LOGOUT BUTTON */}
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-[#F89C74] text-black rounded-xl text-sm font-bold hover:scale-105 transition"
                    >
                        Logout
                    </button>

                </div>
            </div>
            <main className="flex-1 overflow-y-auto p-12 pt-24 custom-scrollbar">
                {view === 'activity' && (
                    <div className="max-w-3xl mx-auto fade-in">
                        <div className="flex flex-col items-center mb-12 gap-4">
                            <div className="flex bg-[#1e1e1e] p-1.5 rounded-2xl w-80 border border-[#2a2a2a]">
                                <button onClick={() => setActiveTab('todo')} className={`flex-1 py-3 rounded-xl font-bold transition ${activeTab === 'todo' ? 'text-[#121212]' : 'text-[#B3B3B3]'}`} style={{ backgroundColor: activeTab === 'todo' ? '#66C5CC' : 'transparent' }}>To-Do List</button>
                                <button
                                    onClick={() => setActiveTab('events')}
                                    className={`px-8 py-3 rounded-xl font-bold uppercase text-xs transition-all ${activeTab === 'events' ? 'bg-[#66C5CC] text-black' : 'bg-[#1e1e1e] text-[#B3B3B3]'}`}
                                >
                                    Event List
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black uppercase tracking-widest text-[#B3B3B3]">show</span>
                                <label className="switch">
                                    <input type="checkbox" checked={hideCompleted} onChange={() => setHideCompleted(!hideCompleted)} />
                                    <span className="slider"></span>
                                </label>
                                <span className="text-[8px] font-black uppercase tracking-widest text-[#B3B3B3]">hide</span>
                            </div>
                        </div>

                        {activeTab === 'todo' ? (
                            <section>
                                <div className="text-3xl font-extrabold uppercase tracking-tighter mb-8 text-center"><h2>Daily Routine</h2></div>
                                <div className="bg-[#1e1e1e] p-6 rounded-3xl border border-[#2a2a2a] mb-8">
                                    <div className="flex gap-3 mb-4">
                                        <input value={todoInput} onChange={(e) => setTodoInput(e.target.value)} className="flex-1 bg-black/20 p-4 rounded-xl outline-none" placeholder="Add task..." />
                                        <button onClick={addDailyItem} className="px-8 rounded-xl font-bold text-2xl" style={{ backgroundColor: '#F89C74', color: '#121212' }}>+</button>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => setTaskMode('task')} className={`text-xs font-bold px-5 py-2 rounded-lg ${taskMode === 'task' ? 'bg-[#66C5CC] text-[#121212]' : 'bg-[#2a2a2a]'}`}>Task</button>
                                        <button onClick={() => setTaskMode('streaks')} className={`text-xs font-bold px-5 py-2 rounded-lg ${taskMode === 'streaks' ? 'bg-[#F6CF71] text-[#121212]' : 'bg-[#2a2a2a]'}`}>streaks 🔥</button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {dailyTasks.filter(t => hideCompleted ? !t.done : true).map(t => (
                                        <div key={t.id} className="flex items-center gap-4 p-5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl group">
                                            <div onClick={() => toggleDailyDone(t.id)} className="w-6 h-6 rounded-lg border-2 cursor-pointer flex items-center justify-center" style={{ backgroundColor: t.done ? (t.type === 'streaks' ? '#F6CF71' : '#66C5CC') : 'transparent', borderColor: t.done ? 'transparent' : '#333' }}>
                                                {t.done && <span className="text-[#121212] font-black text-[10px]">✓</span>}
                                            </div>
                                            <div className="flex-1 flex items-center gap-3">
                                                <span className={t.done ? 'line-through opacity-30' : ''}>{t.text}</span>
                                                {t.type === 'streaks' && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#F6CF71]/20 text-[#F6CF71] uppercase tracking-tighter">Day {t.count}</span>}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Stops the task from being 'checked' accidentally
                                                    deleteTask(t.id);    // Sends the delete command to Firebase
                                                }}
                                                className="opacity-0 group-hover:opacity-100 text-[#B3B3B3] hover:text-red-500 transition-all p-2 cursor-pointer"
                                            >
                                                ✕
                                            </button>                                               </div>
                                    ))}
                                </div>
                            </section>
                        ) : (
                            <section>
                                <div className="text-3xl font-extrabold uppercase tracking-tighter mb-8 text-center"><h2>Event Journeys</h2></div>
                                <div className="bg-[#1e1e1e] p-6 rounded-3xl border border-dashed border-[#333] mb-10 flex gap-3">
                                    <input value={aiInput} onChange={(e) => setAiInput(e.target.value)} className="flex-1 bg-transparent p-4 outline-none" placeholder="Add Major Event..." />
                                    <button
                                        onClick={addJourney}
                                        className="px-8 rounded-xl font-bold uppercase text-xs"
                                        style={{ backgroundColor: '#F89C74', color: '#121212' }}
                                    >
                                        Add Event
                                    </button>
                                </div>
                                <div className="max-w-3xl mx-auto space-y-6">
                                    {loading && (
                                        <div className="text-center text-sm text-[#66C5CC] animate-pulse mt-4">
                                            Generating your journey... ⚡
                                        </div>
                                    )}
                                    {journeys.map(j => {
                                        const safeTasks = j.tasks || [];

                                        const filteredTasks = safeTasks.filter(t =>
                                            hideCompleted ? !t.done : true
                                        );
                                        // --- AFTER ---
                                        const totalTasks = (j.tasks || []).length + (j.tasks || []).reduce(
                                            (acc, t) => acc + (t.subTasks?.length || 0),
                                            0
                                        );

                                        const completedTasks =
                                            (j.tasks || []).filter(t => t.done).length +
                                            (j.tasks || []).reduce(
                                                (acc, t) => acc + (t.subTasks?.filter(s => s.done).length || 0),
                                                0
                                            );

                                        const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                                        const allDone = (j.tasks || []).every(t => t.done);
                                        if (hideCompleted && allDone) return null;
                                        return (
                                            <div key={j.id} className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden transition duration-300
                                                    ${pct === 100
                                                    ? "shadow-[0_0_25px_rgba(34,197,94,0.7)] border-green-400"
                                                    : "hover:border-[#3a3a3a]"
                                                }`}>
                                                <div className="px-6 py-5 flex items-center gap-4">

                                                    <div onClick={() => toggleAllInJourney(j.id)} className="w-7 h-7 rounded-full border-2 border-[#66C5CC] flex items-center justify-center cursor-pointer hover:bg-[#66C5CC]/20 transition" style={{ backgroundColor: allDone ? '#66C5CC' : 'transparent' }}>
                                                        {allDone && <span className="text-[#121212] font-black text-sm">✓</span>}
                                                    </div>

                                                    <h3 className="text-2xl font-black flex-1 uppercase tracking-tighter">
                                                        {j.title}
                                                    </h3>

                                                    {/* 🔽 ADD THIS DROPDOWN BUTTON */}
                                                    <button
                                                        onClick={() => setOpenJourneyId(openJourneyId === j.id ? null : j.id)}
                                                        className="text-[#B3B3B3] hover:text-white text-xl transition"
                                                    >
                                                        {openJourneyId === j.id ? "⌃" : "⌄"}
                                                    </button>

                                                    <span className="font-mono font-bold text-xl" style={{ color: '#F6CF71' }}>
                                                        {pct}%
                                                    </span>

                                                </div>
                                                <div className="w-full h-2 bg-black"><div className="h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: '#66C5CC' }}></div></div>
                                                {openJourneyId === j.id && (
                                                    <div className="p-8 space-y-6 divide-y divide-[#2a2a2a]">
                                                        {filteredTasks.map((t, index) => (
                                                            <div
                                                                key={t.id}
                                                                className="flex flex-col gap-2 group p-3 rounded-lg hover:bg-[#222] transition transform hover:scale-[1.01]"
                                                                style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
                                                            >

                                                                {/* 🔹 MAIN TASK ROW */}
                                                                <div className="flex gap-3">
                                                                    <div
                                                                        onClick={async () => {

                                                                            const updatedTasks = (j.tasks || []).map(y =>
                                                                                y.id === t.id ? { ...y, done: !y.done } : y
                                                                            );

                                                                            await db.collection("journeys").doc(j.id).update({
                                                                                tasks: updatedTasks
                                                                            });

                                                                        }}
                                                                        className="w-4 h-4 rounded border border-[#444] flex items-center justify-center cursor-pointer"
                                                                        style={{
                                                                            backgroundColor: t.done ? '#66C5CC' : 'transparent',
                                                                            borderColor: t.done ? 'transparent' : '#333'
                                                                        }}
                                                                    >
                                                                        {t.done && <span className="text-[#121212] font-black text-[8px]">✓</span>}
                                                                    </div>

                                                                    <div className="flex flex-col flex-1">
                                                                        <div className="flex flex-col flex-1">

                                                                            <span className={`text-sm font-medium text-[#D1D5DB] transition-all duration-300 ${t.done ? 'line-through opacity-30 scale-95' : 'scale-100'}`}>
                                                                                {`✨ Step ${filteredTasks.indexOf(t) + 1}: ${t.text.split(".")[0]}`}
                                                                            </span>

                                                                            {/* 🔗 ADD THIS PART */}
                                                                            {t.resource && (
                                                                                <a
                                                                                    href={t.resource}
                                                                                    target="_blank"
                                                                                    className="text-xs text-[#66C5CC] hover:underline mt-1"
                                                                                >
                                                                                    🔗 Learn more
                                                                                </a>
                                                                            )}

                                                                        </div>

                                                                        {t.done && (
                                                                            <span className="text-xs text-green-400 mt-1">✔ Completed</span>
                                                                        )}
                                                                    </div>

                                                                    <button

                                                                        onClick={() => setJourneys(journeys.map(x =>
                                                                            x.id === j.id
                                                                                ? { ...x, tasks: x.tasks.filter(y => y.id !== t.id) }
                                                                                : x
                                                                        ))}
                                                                        className="opacity-0 group-hover:opacity-100 text-[#B3B3B3] hover:text-[#F89C74]"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>

                                                                {/* 🔹 SUBTASKS */}
                                                                {t.subTasks && t.subTasks.map(sub => (
                                                                    <div key={sub.id} className="ml-6 border-l border-[#2a2a2a] pl-4 flex items-center gap-2 text-sm opacity-70 hover:opacity-100 hover:translate-x-1 transition">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={sub.done}
                                                                            onChange={async () => {

                                                                                const updatedTasks = (j.tasks || []).map(task =>
                                                                                    task.id === t.id
                                                                                        ? {
                                                                                            ...task,
                                                                                            subTasks: (task.subTasks || []).map(s =>
                                                                                                s.id === sub.id ? { ...s, done: !s.done } : s
                                                                                            )
                                                                                        }
                                                                                        : task
                                                                                );

                                                                                await db.collection("journeys").doc(j.id).update({
                                                                                    tasks: updatedTasks
                                                                                });

                                                                            }}
                                                                        />

                                                                        <span className={sub.done ? "line-through opacity-40" : ""}>
                                                                            {sub.text}
                                                                        </span>
                                                                    </div>
                                                                ))}

                                                                {/* 🔹 ADD SUBTASK INPUT */}
                                                                <input
                                                                    placeholder="Add sub-goal..."
                                                                    className="ml-8 text-xs bg-transparent border-b border-[#333] outline-none"
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter" && e.target.value.trim()) {
                                                                            addSubTask(j.id, t.id, e.target.value);
                                                                            e.target.value = "";
                                                                        }
                                                                    }}
                                                                />

                                                            </div>
                                                        ))}
                                                        <input
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter' && e.target.value.trim()) {
                                                                    addTaskToJourney(j.id, e.target.value);
                                                                    e.target.value = "";
                                                                }
                                                            }}
                                                            className="bg-transparent border-b border-[#333] focus:border-[#66C5CC] transition text-sm text-[#D1D5DB] placeholder:text-[#666]"
                                                        />
                                                    </div>
                                                )}

                                            </div>

                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {view === 'dashboard' && (
                    <div className="max-w-5xl mx-auto fade-in">
                        <h2 className="text-5xl font-black mb-12 uppercase tracking-tighter">Dashboard</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                            <div className="bg-[#1e1e1e] p-8 rounded-[2rem] border border-[#2a2a2a] mb-10">
                                <p className="text-xs font-bold uppercase text-[#B3B3B3] mb-2">
                                    Today's Progress
                                </p>

                                <div className="w-full h-3 bg-black rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all duration-700"
                                        style={{
                                            width: `${stats.pct}%`,
                                            backgroundColor: '#66C5CC'
                                        }}
                                    ></div>
                                </div>

                                <p className="text-sm mt-3 text-[#B3B3B3]">
                                    {stats.done} of {stats.total} tasks completed
                                </p>
                            </div>
                            <p className="text-xs mt-4 text-[#888] italic">
                                {stats.pct === 100
                                    ? "🔥 Perfect day! You're unstoppable."
                                    : stats.pct > 70
                                        ? "⚡ Great progress, keep pushing."
                                        : stats.pct > 30
                                            ? "💡 You're getting there."
                                            : "🚀 Start small, build momentum."}
                            </p>
                            <div className="bg-[#1e1e1e] p-8 rounded-[2rem] border border-[#2a2a2a]"><p className="text-xs font-bold uppercase text-[#B3B3B3] mb-2">Focus</p><h4 className="text-5xl font-black text-[#66C5CC]">
                                {isNaN(stats.pct) ? 0 : stats.pct}%
                            </h4></div>
                            <div className="bg-[#1e1e1e] p-8 rounded-[2rem] border border-[#2a2a2a]"><p className="text-xs font-bold uppercase text-[#B3B3B3] mb-2">Done</p><h4 className="text-5xl font-black text-[#F89C74]">{stats.done}</h4></div>
                            <div className="bg-[#1e1e1e] p-8 rounded-[2rem] border border-[#2a2a2a]"><p className="text-xs font-bold uppercase text-[#B3B3B3] mb-2">Total</p><h4 className="text-5xl font-black text-white">{stats.total}</h4></div>
                            <div className="bg-[#1e1e1e] p-8 rounded-[2rem] border border-[#2a2a2a]"><p className="text-xs font-bold uppercase text-[#B3B3B3] mb-2">Stricks (Days)</p><h4 className="text-5xl font-black text-[#F6CF71]">{stats.streaksCount}</h4></div>
                        </div>

                        <div className="bg-[#1e1e1e] p-10 rounded-[3rem] border border-[#2a2a2a] h-80">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#B3B3B3] mb-6">Activity Graph</h3>
                            <div className="relative h-48 w-full">
                                <canvas id="progressChart"></canvas>
                                <div className="mt-10">
                                    <h3 className="text-lg font-bold mb-4 text-[#66C5CC]">
                                        Recent Journeys
                                    </h3>

                                    <div className="space-y-3">
                                        {journeys.slice(0, 3).map(j => {
                                            const done = (j.tasks || []).filter(t => t.done).length;
                                            const total = (j.tasks || []).length;
                                            const percent = total ? Math.round((done / total) * 100) : 0;

                                            return (
                                                <div key={j.id} className="p-4 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl">
                                                    <div className="flex justify-between text-sm mb-2">
                                                        <span>{j.title}</span>
                                                        <span>{percent}%</span>
                                                    </div>

                                                    <div className="w-full h-2 bg-black rounded">
                                                        <div
                                                            className="h-full"
                                                            style={{
                                                                width: `${percent}%`,
                                                                backgroundColor: '#F89C74'
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'diary' && (
                    <div className="max-w-5xl mx-auto fade-in">
                        <div className="flex justify-between items-end mb-12">
                            <h2 className="text-5xl font-black uppercase tracking-tighter">Achievement Diary</h2>
                            <div className="text-[#66C5CC] font-bold text-sm uppercase tracking-widest">Growth Archive</div>
                        </div>

                        <div className="bg-[#1e1e1e] p-10 rounded-[3rem] border border-[#2a2a2a] mb-12 flex flex-col md:flex-row gap-10">
                            <div className="flex-1 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase text-[#B3B3B3]">Start Date</p>
                                        <input type="date" value={newEntry.start} onChange={(e) => setNewEntry({ ...newEntry, start: e.target.value })} className="w-full bg-black/20 p-3 rounded-xl border border-[#333] outline-none text-xs text-[#66C5CC]" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase text-[#B3B3B3]">End Date</p>
                                        <input type="date" value={newEntry.end} onChange={(e) => setNewEntry({ ...newEntry, end: e.target.value })} className="w-full bg-black/20 p-3 rounded-xl border border-[#333] outline-none text-xs text-[#F89C74]" />
                                    </div>
                                </div>
                                <textarea value={newEntry.text} onChange={(e) => setNewEntry({ ...newEntry, text: e.target.value })} className="w-full bg-black/20 p-6 rounded-2xl h-32 outline-none handwritten text-2xl text-white resize-none" placeholder="Describe your breakthrough..."></textarea>
                                <button onClick={saveAchievement} className="px-8 py-3 rounded-xl font-bold uppercase text-xs" style={{ backgroundColor: '#66C5CC', color: '#121212' }}>Commit to History</button>
                            </div>
                            <div className="w-full md:w-64">
                                <label className="w-full h-full border-2 border-dashed border-[#333] rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-[#66C5CC] transition group overflow-hidden bg-black/10 min-h-[200px]">
                                    {newEntry.photo ? (
                                        <img src={newEntry.photo} className="w-full h-full object-cover" alt="Achievement" />
                                    ) : (
                                        <div className="text-center p-6">
                                            <div className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center mb-3 mx-auto group-hover:bg-[#66C5CC] transition-colors">
                                                <svg className="w-6 h-6 text-[#B3B3B3] group-hover:text-[#121212]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                                                </svg>
                                            </div>
                                            <p className="text-[10px] font-black uppercase text-[#B3B3B3]">Upload Visual</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setNewEntry({ ...newEntry, photo: reader.result });
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>
                            </div>

                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#2a2a2a] border border-[#2a2a2a] rounded-[3rem] overflow-hidden shadow-2xl">
                            {diaryEntries.length === 0 ? (
                                <div className="col-span-2 p-20 text-center opacity-20"><h4 className="text-3xl font-black uppercase tracking-widest italic">The pages are empty. Start your journey.</h4></div>
                            ) : (
                                diaryEntries.map((entry, idx) => (
                                    <div key={entry.id} className={`diary-page p-10 min-h-[400px] flex flex-col ${idx % 2 === 0 ? 'border-r border-[#2a2a2a]' : ''}`}>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="bg-[#121212] px-4 py-1 rounded-full border border-[#333] flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-[#66C5CC]">{entry.start || '---'}</span>
                                                <span className="text-[8px] text-[#B3B3B3]">TO</span>
                                                <span className="text-[10px] font-bold text-[#F89C74]">{entry.end || '---'}</span>
                                            </div>
                                            <span className="font-mono text-[10px] text-[#333]">#00{diaryEntries.length - idx}</span>
                                        </div>
                                        {editingId === entry.id ? (
                                            <div className="flex flex-col gap-2">
                                                <textarea
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    className="bg-black/20 p-3 rounded-xl"
                                                />
                                                <button
                                                    onClick={() => updateDiary(entry.id)}
                                                    className="text-xs text-green-400"
                                                >
                                                    Save ✅
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="handwritten text-3xl leading-relaxed text-[#f8fafc] flex-1 mb-6">
                                                "{entry.text}"
                                            </p>
                                        )}
                                        {entry.photo && (
                                            <div className="w-full h-48 rounded-2xl overflow-hidden grayscale hover:grayscale-0 transition duration-500 border border-[#333]">
                                                <img src={entry.photo} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center">
                                            <button
                                                onClick={() => deleteDiary(entry.id)}
                                                className="text-xs text-red-400 hover:text-red-600"
                                            >
                                                Delete ❌
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingId(entry.id);
                                                    setEditText(entry.text);
                                                }}
                                                className="text-xs text-blue-400 hover:text-blue-600 ml-4"
                                            >
                                                Edit ✏️
                                            </button>
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 rounded-full bg-[#66C5CC]"></div>
                                                <div className="w-2 h-2 rounded-full bg-[#F6CF71]"></div>
                                                <div className="w-2 h-2 rounded-full bg-[#F89C74]"></div>
                                            </div>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-[#333]">Verified Growth</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {view === 'profile' && (
                    <div className="max-w-4xl mx-auto fade-in">
                        <h2 className="text-5xl font-black mb-12 uppercase">Profile</h2>
                        <div className="bg-[#1e1e1e] p-12 rounded-[3rem] border border-[#2a2a2a] flex flex-col md:flex-row gap-12 items-start md:items-center flex-wrap">
                            <div className="w-40 h-40 bg-[#F6CF71] rounded-[2.5rem] flex items-center justify-center text-6xl font-black text-[#121212]">U</div>
                            <div className="flex-1 text-center md:text-left">
                                <input
                                    value={profile.name}
                                    onChange={(e) => {
                                        const updated = { ...profile, name: e.target.value };
                                        setProfile(updated);
                                        saveProfileToFirebase(updated);
                                    }}
                                    className="text-4xl font-black mb-2 bg-transparent border-b border-[#333] outline-none text-center md:text-left"
                                />
                                <div className="flex gap-2 flex-wrap mt-4">
                                    {badges.map((b, i) => (
                                        <div
                                            key={i}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold text-white 
                                            bg-gradient-to-r ${b.color} shadow-lg hover:scale-105 transition`}
                                        >
                                            <span>{b.icon}</span>
                                            <span>{b.name}</span>
                                        </div>
                                    ))}
                                    <button
                                        onClick={generateSummary}
                                        className="mt-6 px-6 py-2 bg-[#66C5CC] text-black rounded-xl font-bold"
                                    >
                                        Generate AI Summary
                                    </button>

                                    {aiSummary && (
                                        <p className="mt-4 text-sm text-[#B3B3B3]">{aiSummary}</p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-6">
                                    <div className="p-4 bg-black/20 rounded-xl border border-[#333]"><p className="text-[10px] font-black text-[#B3B3B3] uppercase">Rank</p><p className="text-lg font-bold text-[#66C5CC]">
                                        {stats.pct > 80 ? "Elite" : stats.pct > 50 ? "Pro" : "Beginner"}
                                    </p></div>
                                    <div className="p-4 bg-black/20 rounded-xl border border-[#333]"><p className="text-[10px] font-black text-[#B3B3B3] uppercase">Consistency</p><p className="text-lg font-bold text-[#F89C74]">
                                        {stats.done} Tasks Completed
                                    </p></div>
                                    <div className="p-4 bg-black/20 rounded-xl border border-[#333]">
                                        <p className="text-[10px] font-black text-[#B3B3B3] uppercase">Streak</p>
                                        <p className="text-lg font-bold text-[#F6CF71]">{stats.streaksCount} Days</p>
                                    </div>
                                </div>
                            </div>
                            <h3>Weekly Stats</h3>
                            <div className="mt-10 w-full md:w-64 h-40">
                                <canvas id="weeklyChart"></canvas>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'help' && (
                    <div className="max-w-3xl mx-auto fade-in py-10">
                        <h2 className="text-5xl font-black mb-12 uppercase text-center" style={{ color: '#66C5CC' }}>Help</h2>
                        <div className="space-y-4">
                            {[
                                {
                                    q: "What is Streaks?",
                                    a: "Streaks track how many days you complete a habit continuously."
                                },
                                {
                                    q: "What is Journey?",
                                    a: "Journeys are long-term goals broken into steps and sub-tasks."
                                },
                                {
                                    q: "How does AI help?",
                                    a: "AI generates structured learning paths and summaries for you."
                                },
                                {
                                    q: "Is my data saved?",
                                    a: "Yes, your tasks and diary are stored in Firebase."
                                }
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="bg-[#1e1e1e] p-6 rounded-2xl border border-[#2a2a2a] cursor-pointer"
                                    onClick={() => setOpenHelp(openHelp === i ? null : i)}
                                >
                                    <h4 className="font-bold text-lg">{item.q}</h4>

                                    {openHelp === i && (
                                        <p className="text-sm text-[#B3B3B3] mt-3">{item.a}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'about' && (
                    <div className="max-w-2xl mx-auto fade-in py-20 text-center">
                        <h2 className="text-6xl font-black mb-8 uppercase" style={{ color: '#66C5CC' }}>FocusFlow</h2>
                        <p>
                            FocusFlow is a productivity system designed to help you turn ideas into action.
                        </p>

                        <p>
                            It combines daily task tracking, long-term goal journeys, and AI-powered insights
                            to help you stay consistent and grow every day.
                        </p>

                        <p>
                            This app is built using React, Firebase, and modern UI principles to deliver
                            a clean and powerful experience.
                        </p>
                        <div className="mt-6 p-6 bg-[#1e1e1e] rounded-2xl border border-[#2a2a2a]">
                            <p className="text-sm uppercase text-[#66C5CC] font-bold">Developers</p>
                            <h3 className="text-xl font-black mt-2">Bhoomi Gujar</h3>
                            <h3 className="text-xl font-black mt-2">Shreyash Dhale</h3>
                            <h3 className="text-xl font-black mt-2">Nayana Gowda</h3>
                            <p className="text-xs mt-2">SYBSc Computer Science</p>
                        </div>

                    </div>

                )}

            </main>

            <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end">
                {isChatOpen && (
                    <div className="mb-4 w-80 h-[400px] bg-[#1e1e1e] border border-[#2a2a2a] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden fade-in">
                        <div className="p-5 flex items-center justify-between bg-[#222]">
                            <span className="font-black text-[10px] uppercase text-[#66C5CC]">Predictor AI</span>
                            <button onClick={() => setIsChatOpen(false)} className="text-[#B3B3B3] hover:text-white">✕</button>
                        </div>
                        <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar">
                            {chatMessages.map((m, i) => (
                                <div key={i} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-4 rounded-2xl text-xs font-semibold ${m.type === 'user' ? 'bg-[#66C5CC] text-[#121212]' : 'bg-[#2a2a2a]'}`}>{m.text}</div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-[#2a2a2a]">
                            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={async (e) => {
                                if (e.key === 'Enter' && chatInput.trim()) {

                                    const userMessage = chatInput;

                                    // Show user message
                                    setChatMessages(prev => [
                                        ...prev,
                                        { type: 'user', text: userMessage }
                                    ]);

                                    setChatInput("");

                                    // Temporary loading
                                    setChatMessages(prev => [
                                        ...prev,
                                        { type: 'ai', text: "Thinking..." }
                                    ]);

                                    // Get AI response
                                    const reply = await sendChatToAI(userMessage);

                                    // Replace "Thinking..."
                                    setChatMessages(prev => [
                                        ...prev.slice(0, -1),
                                        { type: 'ai', text: reply }
                                    ]);
                                }
                            }} className="w-full bg-black/20 p-4 rounded-xl outline-none text-xs" placeholder="Ask AI..." />
                        </div>
                    </div>
                )}
                <button onClick={() => setIsChatOpen(!isChatOpen)} className="w-16 h-16 rounded-full bg-[#66C5CC] shadow-2xl flex items-center justify-center text-3xl hover:scale-110 transition active:scale-95">🤖</button>
            </div>
        </div>
    );
};
// This tells the browser: "Wait until the HTML is 100% loaded, THEN start React"
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

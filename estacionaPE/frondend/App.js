import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useFocusEffect, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import * as SplashScreen from 'expo-splash-screen';
import {
  AlertCircle,
  BookOpen, Briefcase, Car, ChevronRight, Clock,
  CreditCard, Edit, Heart, Home, Lock, LogOut, Mail, Map as MapIcon,
  Navigation, Phone, QrCode, Search,
  Star, User, X, Zap
} from 'lucide-react-native';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions, FlatList, Image,
  KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity,
  Vibration,
  View
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// --------------------------------------------------------------------------------
// ✅ CONFIGURACIÓN IP (Actualizada con tu ipconfig)
// --------------------------------------------------------------------------------
const API_URL = 'http://192.168.100.14:5000/api'; 

SplashScreen.preventAutoHideAsync();

// --- COLORES ---
const COLORS = {
  bgDark: '#0f172a', cardDark: '#1e293b', primary: '#3b82f6', primaryHover: '#2563eb',
  textWhite: '#f1f5f9', textGray: '#94a3b8', success: '#10b981', danger: '#ef4444',
  warning: '#f59e0b', info: '#0ea5e9', inputBg: '#334155',
};

// --- IMÁGENES ---
const IMAGES = {
  splash1: { uri: 'https://images.unsplash.com/photo-1621929747188-b244589bc9c2?w=800&q=80' }, 
  splash2: { uri: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&q=80' },
  splash3: { uri: 'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=800&q=80' },
  logo: { uri: 'https://cdn-icons-png.flaticon.com/512/2330/2330453.png' }, 
  avatar_man: { uri: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' },
  avatar_woman: { uri: 'https://cdn-icons-png.flaticon.com/512/4140/4140047.png' },
  // Mantenemos estas como fallback, pero usaremos las dinámicas abajo
  parking1: { uri: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&q=80' },
  parking2: { uri: 'https://images.unsplash.com/photo-1470224114660-3f6686c562eb?w=800&q=80' },
};

// --------------------------------------------------------------------------------
// ✅ NUEVA LÓGICA DE IMÁGENES (Punto 1 Solicitado)
// --------------------------------------------------------------------------------
const PARKING_URLS = [
    'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&q=80', // Parking Tech
    'https://images.unsplash.com/photo-1570129477492-45f043ddc71a?w=800&q=80', // Edificio moderno
    'https://images.unsplash.com/photo-1470224114660-3f6686c562eb?w=800&q=80', // Subterráneo
    'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&q=80', // Concreto
    'https://images.unsplash.com/photo-1621929747188-b244589bc9c2?w=800&q=80', // Estilo abierto
];

const getParkingImage = (parking) => {
    if (parking?.image_url) return { uri: parking.image_url };
    // Asignación determinista basada en el ID para que siempre salga la misma foto para la misma cochera
    const index = (parking?.id || 0) % PARKING_URLS.length;
    return { uri: PARKING_URLS[index] };
};

// --------------------------------------------------------------------------------
// ✅ FUNCIONES DE TIEMPO FIJO (Puntos 2 y 3 Solicitados)
// --------------------------------------------------------------------------------

// Muestra la hora EXACTA que viene de la BD cortando el string. 
// No usa new Date() para renderizar texto, evitando cambios si mueves la hora del celular.
const formatStaticTime = (isoString) => {
    if (!isoString || typeof isoString !== 'string') return "--:--";
    try {
        // Asumiendo formato ISO del backend: "2025-12-06T07:30:00..."
        // Tomamos exactamente lo que viene después de la T
        const timePart = isoString.split('T')[1]; 
        if (!timePart) return "--:--";
        
        // Cortamos hh:mm
        const [hRaw, mRaw] = timePart.split(':');
        let h = parseInt(hRaw, 10);
        const m = mRaw;
        
        // Convertimos a 12h solo para visualización, sin cambiar el valor base
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12; 
        
        return `${h}:${m} ${ampm}`;
    } catch (e) { return "--:--"; }
};

// Genera un string ISO LOCAL exacto para guardar lo que el usuario seleccionó.
const getLocalISOString = (date) => {
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, -1); 
};

// --- CONTEXTO AUTH ---
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const getHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' });

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al iniciar sesión');
      setToken(data.access_token);
      const userData = { ...data.user, balance: parseFloat(data.user.balance) };
      setUser(userData); 
      return true;
    } catch (error) { 
        Alert.alert("Error de Conexión", error.message); 
        return false; 
    } 
    finally { setIsLoading(false); }
  };
  const logout = () => { setUser(null); setToken(null); };
  const refreshUser = async () => {
    if (!user || !token) return;
    try {
      const response = await fetch(`${API_URL}/users/${user.id}`, { headers: getHeaders() });
      if (response.ok) {
        const updated = await response.json();
        setUser(prev => ({ ...prev, ...updated, balance: parseFloat(updated.balance) })); 
      }
    } catch(e) { console.log(e); }
  }
  const registerUser = async (userData) => {
    try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/users/`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(userData)
        });
        const data = await response.json();
        if(!response.ok) throw new Error(data.message || "Error en registro");
        await login(userData.email, userData.password);
        return true;
    } catch (e) { Alert.alert("Error", e.message); return false; } 
    finally { setIsLoading(false); }
  }
  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, registerUser, isLoading, getHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}
const useAuth = () => useContext(AuthContext);

// --- COMPONENTES UI ---
const Button = ({ text, onPress, icon, variant = 'primary', disabled = false, style, textStyle }) => {
  const bg = disabled ? '#334155' : (variant === 'primary' ? COLORS.primary : variant === 'danger' ? COLORS.danger : 'transparent');
  const textColor = disabled ? '#94a3b8' : COLORS.textWhite;
  const border = variant === 'outline' ? { borderWidth: 1, borderColor: COLORS.primary } : {};
  return (
    <TouchableOpacity onPress={disabled ? null : onPress} style={[styles.btn, { backgroundColor: bg }, border, style]} activeOpacity={0.8}>
      {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
      <Text style={[styles.btnText, { color: textColor }, textStyle]}>{text}</Text>
    </TouchableOpacity>
  );
};

const Input = ({ label, value, onChangeText, placeholder, secure, icon, keyboardType = 'default', maxLength }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrapper}>
      {icon && <View style={{ marginRight: 10, opacity: 0.7 }}>{icon}</View>}
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#64748B" secureTextEntry={secure} autoCapitalize="none" keyboardType={keyboardType} maxLength={maxLength} />
    </View>
  </View>
);
const Card = ({ children, style }) => (<View style={[styles.card, style]}>{children}</View>);
const Badge = ({ text, color, bg }) => (<View style={[styles.badge, { backgroundColor: bg || '#334155' }]}><Text style={[styles.badgeText, { color: color || COLORS.textWhite }]}>{text}</Text></View>);

function CustomSplashScreen({ onFinish }) {
  const [index, setIndex] = useState(0);
  const images = [IMAGES.splash1, IMAGES.splash2, IMAGES.splash3];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => { async function hideNative() { await SplashScreen.hideAsync(); } hideNative(); }, []);
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    const interval = setInterval(() => {
      setIndex((prev) => {
        if (prev === images.length - 1) { clearInterval(interval); onFinish(); return prev; }
        return prev + 1;
      });
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden />
      <Animated.Image source={images[index]} style={{ width: width, height: '100%', resizeMode: 'cover', opacity: fadeAnim }} />
      <View style={{ position: 'absolute', bottom: 60, alignSelf: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 24, letterSpacing: 1, marginBottom: 5 }}>ESTACIONAPE</Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Tu espacio seguro</Text>
      </View>
    </View>
  );
}

// --- PANTALLAS ---
function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const handleLogin = async () => {
    if(!email || !password) return Alert.alert("Error", "Campos vacíos");
    const success = await login(email.trim(), password);
    if (success) navigation.replace('MainTabs');
  };
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDark} />
      <View style={styles.loginContent}>
        <View style={styles.phoneFrame}>
            <View style={styles.phoneNotch} />
            <Image source={IMAGES.logo} style={{ width: 80, height: 80, resizeMode: 'contain' }} />
        </View>
        <Text style={styles.title}>Bienvenido</Text>
        <Text style={styles.subtitle}>Ingresa a tu cuenta.</Text>
        <View style={{ width: '100%', marginTop: 40 }}>
          <Input label="Correo" placeholder="ej. usuario@ep.pe" value={email} onChangeText={setEmail} icon={<Mail size={20} color={COLORS.textGray} />} keyboardType="email-address" />
          <Input label="Contraseña" placeholder="••••••" value={password} onChangeText={setPassword} secure icon={<Lock size={20} color={COLORS.textGray} />} />
          {isLoading ? <ActivityIndicator color={COLORS.primary} style={{marginTop: 20}} /> : <Button text="INICIAR SESIÓN" onPress={handleLogin} style={{ marginTop: 10 }} /> }
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: COLORS.textGray }}>¿No tienes cuenta? <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Regístrate</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [gender, setGender] = useState('man');
  const { registerUser, isLoading } = useAuth();
  const handleRegister = async () => {
    if (!name || !email || !password || !dni || !phone) { Alert.alert("Error", "Completa campos obligatorios."); return; }
    const success = await registerUser({ name, email, password, role: 'client', gender, dni, phone, plate });
    if (success) { Alert.alert("¡Éxito!", `Hola ${name}`, [{ text: "Vamos", onPress: () => navigation.replace('MainTabs') }]); }
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ChevronRight color="white" size={24} style={{ transform: [{ rotate: '180deg' }] }} /></TouchableOpacity>
        <Text style={[styles.title, { marginBottom: 20 }]}>Crear{"\n"}Cuenta</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 20, marginBottom: 20 }}>
            <TouchableOpacity onPress={() => setGender('man')} style={[styles.avatarOption, gender === 'man' && styles.avatarSelected]}>
                <Image source={IMAGES.avatar_man} style={{ width: 50, height: 50 }} />
                <Text style={{ color: COLORS.textGray, marginTop: 5 }}>Hombre</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setGender('woman')} style={[styles.avatarOption, gender === 'woman' && styles.avatarSelected]}>
                <Image source={IMAGES.avatar_woman} style={{ width: 50, height: 50 }} />
                <Text style={{ color: COLORS.textGray, marginTop: 5 }}>Mujer</Text>
            </TouchableOpacity>
            </View>
            <Input label="Nombre Completo" value={name} onChangeText={setName} placeholder="Tu nombre" icon={<User size={20} color={COLORS.textGray} />} />
            <Input label="DNI" value={dni} onChangeText={setDni} placeholder="8 dígitos" keyboardType="numeric" maxLength={8} icon={<CreditCard size={20} color={COLORS.textGray} />} />
            <Input label="Celular" value={phone} onChangeText={setPhone} placeholder="9 dígitos" keyboardType="phone-pad" maxLength={9} icon={<Phone size={20} color={COLORS.textGray} />} />
            <Input label="Placa (Opcional)" value={plate} onChangeText={setPlate} placeholder="ABC-123" icon={<Car size={20} color={COLORS.textGray} />} />
            <Input label="Correo" value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" icon={<Mail size={20} color={COLORS.textGray} />} keyboardType="email-address" />
            <Input label="Contraseña" value={password} onChangeText={setPassword} secure placeholder="Min. 6 caracteres" icon={<Lock size={20} color={COLORS.textGray} />} />
            {isLoading ? <ActivityIndicator color={COLORS.primary} style={{marginTop:20}}/> : <Button text="REGISTRARSE" onPress={handleRegister} style={{ marginTop: 20, marginBottom: 40 }} /> }
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function MapScreen({ route }) {
  const [parkings, setParkings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [period, setPeriod] = useState('AM');
  const [duration, setDuration] = useState('1');
  const navigation = useNavigation();
  const { user, getHeaders, refreshUser } = useAuth();
  const [region, setRegion] = useState({ latitude: -16.4090, longitude: -71.5375, latitudeDelta: 0.05, longitudeDelta: 0.05 });

  useEffect(() => {
    const fetchParkings = () => {
        fetch(`${API_URL}/parkings/`)
        .then(r => { if (!r.ok) throw new Error('Error en API'); return r.json(); })
        .then(data => { if (Array.isArray(data)) setParkings(data); })
        .catch(e => console.log("Error cargando parkings:", e));
    }
    fetchParkings();
    const interval = setInterval(fetchParkings, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        setRegion({ latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });
      }
    })();
  }, []);

  useEffect(() => {
    if (route.params?.parkingId && parkings.length > 0) {
        const park = parkings.find(p => p.id === route.params.parkingId);
        if (park) { setSelected(park); setRegion({ latitude: park.lat, longitude: park.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }); }
    }
  }, [route.params, parkings]);

  const filteredParkings = parkings.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const [localFavs, setLocalFavs] = useState([]);
  const isFavorite = selected && localFavs.includes(selected.id);
  const handleToggleFavorite = () => { if(isFavorite) setLocalFavs(localFavs.filter(id => id !== selected.id)); else setLocalFavs([...localFavs, selected.id]); };
  const handleTimeChange = (text) => {
      const cleanText = text.replace(/[^0-9]/g, '');
      let formattedText = cleanText;
      if (cleanText.length > 2) formattedText = cleanText.substring(0, 2) + ':' + cleanText.substring(2, 4);
      setSelectedTime(formattedText);
  };
  const handleReservePress = () => {
    if (!selected) return;
    if (selected.available <= 0) { Alert.alert("Aforo Completo", "Lo sentimos, esta cochera ya no tiene espacios disponibles."); return; }
    if (user.role !== 'client') { Alert.alert("Acceso", "Solo clientes pueden reservar."); return; }
    setSelectedTime(''); setDuration('1'); setPeriod('AM'); setModalVisible(true);
  };

  const confirmReservation = async (time24h, durationStr, method) => {
    try {
        const checkResp = await fetch(`${API_URL}/parkings/${selected.id}`);
        const checkData = await checkResp.json();
        if (checkData.available <= 0) {
            Alert.alert("¡Lo sentimos!", "La última cochera acaba de ser ocupada por otro usuario.");
            setModalVisible(false);
            setParkings(prev => prev.map(p => p.id === selected.id ? { ...p, available: 0 } : p));
            return; 
        }

        const dur = parseInt(durationStr);
        const [hStr, mStr] = time24h.split(':');
        const h = parseInt(hStr);
        const m = parseInt(mStr);
        
        // 1. Usar hora del celular (New Date puro)
        const now = new Date();
        let start = new Date();
        start.setHours(h, m, 0, 0);

        // Si la hora ya pasó hoy, asumimos que es para mañana
        if (start < now) {
            start.setDate(start.getDate() + 1);
        }

        let end = new Date(start);
        end.setHours(start.getHours() + dur);

        // 2. IMPORTANTE: Generar el string LOCAL para guardar EXACTAMENTE lo que ve el usuario.
        // Si usamos .toISOString() directo, se convierte a UTC y cambia la hora.
        // Usamos la función auxiliar getLocalISOString.
        const startISO = getLocalISOString(start);
        const endISO = getLocalISOString(end);

        const totalAmount = parseFloat(selected.price_per_hour) * dur;

        if(method === 'Saldo' && parseFloat(user.balance) < totalAmount) {
            Alert.alert("Saldo Insuficiente", "Recarga tu cuenta en el Perfil."); return;
        }

        const resPayload = {
            parking_id: selected.id, user_id: user.id, start_time: startISO, end_time: endISO,
            status: method === 'Saldo' ? "paid" : "reserved", total_amount: totalAmount.toFixed(2)
        };

        const createRes = await fetch(`${API_URL}/reservations/`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(resPayload) });
        if(!createRes.ok) { const err = await createRes.json(); throw new Error(err.message || "Error al crear reserva"); }
        
        const newReserva = await createRes.json();
        setParkings(prev => prev.map(p => p.id === selected.id ? { ...p, available: p.available - 1 } : p));

        if (method === 'Saldo') {
            await fetch(`${API_URL}/payments/pay-reservation/${newReserva.id}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ method: 'saldo' }) });
            await refreshUser();
        }
        
        // Usamos la misma función estática para el alert
        Alert.alert("¡Reserva Confirmada!", `Te esperamos a las ${formatStaticTime(startISO)}`);
        setModalVisible(false); setSelected(null); navigation.navigate('PanelTab');
    } catch (error) { Alert.alert("Error de Conexión", error.message); }
  };

  const handleTimeSubmit = () => {
      const timeRegex = /^(0[1-9]|1[0-2]):[0-5][0-9]$/;
      if(!timeRegex.test(selectedTime)) return Alert.alert("Hora Inválida", "Formato 01:00 - 12:59");
      const dur = parseInt(duration);
      if(isNaN(dur) || dur < 1) return Alert.alert("Error", "Duración inválida");
      
      let [h, m] = selectedTime.split(':').map(Number);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      const time24h = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      
      // Mostrar confirmación visual simple (solo para el alert, no afecta lógica)
      let displayStart = `${selectedTime} ${period}`;
      const totalCost = (parseFloat(selected.price_per_hour) * dur).toFixed(2);

      Alert.alert("Confirmar Reserva", `Horario: ${displayStart} (+${dur}h)\nTotal: S/ ${totalCost}`, [
          { text: "Saldo App", onPress: () => confirmReservation(time24h, duration, "Saldo") },
          { text: "Yape / Plin", onPress: () => confirmReservation(time24h, duration, "Yape") },
          { text: "Cancelar", style: "cancel" }
      ]);
  };
  
  const getEstimatedTimes = () => {
      if(selectedTime.length !== 5) return "";
      const dur = parseInt(duration);
      if(isNaN(dur) || dur < 1) return "";
      return `Inicio: ${selectedTime} ${period} (+${dur}h)`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgDark }}>
      <StatusBar barStyle="light-content" />
      <View style={styles.searchBar}>
        <Search color={COLORS.textGray} size={20} />
        <TextInput placeholder="Buscar cochera..." style={styles.searchInput} placeholderTextColor={COLORS.textGray} value={searchTerm} onChangeText={setSearchTerm} />
      </View>
      <MapView style={{ flex: 1 }} region={region} showsUserLocation={true} onPress={() => setSelected(null)} userInterfaceStyle="dark" customMapStyle={MAP_STYLE}>
        {filteredParkings.map(p => (
          <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} onPress={(e) => { e.stopPropagation(); setSelected(p); }}>
            <View style={[styles.marker, { backgroundColor: p.available > 0 ? COLORS.success : COLORS.danger }]}>
                <Text style={{color: 'white', fontWeight: 'bold', fontSize: 14}}>P</Text>
            </View>
          </Marker>
        ))}
      </MapView>
      {selected && (
        <View style={styles.bottomSheet}>
          <TouchableOpacity onPress={() => setSelected(null)} style={{position:'absolute', top: 10, right: 10, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 5, borderRadius: 20}}>
             <X size={20} color="white"/>
          </TouchableOpacity>
          {/* ✅ IMAGEN DINÁMICA AQUI */}
          <Image source={getParkingImage(selected)} style={styles.sheetImage} />
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
              <View style={{ flex: 1 }}><Text style={styles.bsTitle}>{selected.name}</Text><Text style={styles.bsSubtitle}>{selected.district}</Text></View>
              <TouchableOpacity onPress={handleToggleFavorite} style={{marginTop: 5}}><Heart size={28} color={isFavorite ? COLORS.danger : COLORS.textGray} fill={isFavorite ? COLORS.danger : 'transparent'} /></TouchableOpacity>
            </View>
            <View style={styles.statsGrid}>
                <View style={styles.statItem}><Star size={18} color={COLORS.warning} fill={COLORS.warning} /><Text style={styles.statValue}>4.5</Text><Text style={styles.statLabel}>Calificación</Text></View>
                <View style={styles.statItem}><Clock size={18} color={COLORS.primary} /><Text style={styles.statValue} numberOfLines={1}>{selected.hours || "24h"}</Text><Text style={styles.statLabel}>Apertura</Text></View>
                <View style={styles.statItem}><Car size={18} color={selected.available > 0 ? COLORS.success : COLORS.danger} /><Text style={[styles.statValue, {color: selected.available > 0 ? COLORS.success : COLORS.danger}]}>{selected.available}</Text><Text style={styles.statLabel}>Libres</Text></View>
                <View style={styles.statItem}><Text style={{fontSize: 18, fontWeight: 'bold', color: COLORS.textWhite}}>S/ {selected.price_per_hour}</Text><Text style={styles.statLabel}>Por Hora</Text></View>
            </View>
            <Button text={selected.available > 0 ? "RESERVAR AHORA" : "AGOTADO"} onPress={handleReservePress} disabled={selected.available <= 0} style={{marginTop: 15}} variant={selected.available > 0 ? 'primary' : 'disabled'} />
          </View>
        </View>
      )}
      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 15}}>
                    <Text style={styles.modalTitle}>Nueva Reserva</Text>
                    <TouchableOpacity onPress={()=>setModalVisible(false)}><X color={COLORS.textGray}/></TouchableOpacity>
                </View>
                <Text style={{color: COLORS.textGray, marginBottom: 5}}>Hora de llegada (12h - Hora Celular)</Text>
                <View style={{flexDirection: 'row', gap: 10}}>
                    <TextInput style={[styles.modalInput, {flex: 2}]} placeholder="Ej: 0430" placeholderTextColor="#666" value={selectedTime} onChangeText={handleTimeChange} keyboardType="number-pad" maxLength={5} />
                    <TouchableOpacity onPress={() => setPeriod('AM')} style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]}><Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>AM</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setPeriod('PM')} style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]}><Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>PM</Text></TouchableOpacity>
                </View>
                <Text style={{color: COLORS.textGray, marginBottom: 5, marginTop: 10}}>Duración (Horas)</Text>
                <TextInput style={styles.modalInput} placeholder="1" placeholderTextColor="#666" value={duration} onChangeText={setDuration} keyboardType="numeric"/>
                {selectedTime.length === 5 && <View style={{marginTop: 10, padding: 10, backgroundColor: COLORS.inputBg, borderRadius: 8}}><Text style={{color: COLORS.info, textAlign: 'center'}}>{getEstimatedTimes()}</Text></View>}
                <Button text="Continuar" onPress={handleTimeSubmit} style={{marginTop: 10}}/>
            </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const ReservationCard = ({ item, navigation, parkings, refresh }) => {
    const park = parkings.find(p => p.id === item.parking_id);
    
    // ✅ 2. USO DE formatStaticTime: 
    // Visualizamos la hora exactamente como viene del backend sin recalcular.
    // Al refrescar el componente (vía refresh), se lee el nuevo item.start_time y se renderiza automáticamente.
    const scheduleStr = `${formatStaticTime(item.start_time)} - ${formatStaticTime(item.end_time)}`;
    
    // Obtener solo la fecha (YYYY-MM-DD) del string
    const dateStr = item.start_time ? item.start_time.split('T')[0] : "Fecha inválida";

    const [timeLeft, setTimeLeft] = useState('');
    const [statusLabel, setStatusLabel] = useState('Pendiente');
    const [isUrgent, setIsUrgent] = useState(false);
    const hasAlertedRef = useRef(false);

    const handleExtend = async () => {
        Alert.alert("Extender Tiempo", "Se añadirá 1 hora extra por S/ " + (park?.price_per_hour || '5.00'), [
            { text: "Cancelar", style: "cancel" },
            { text: "Confirmar", onPress: async () => { 
                // Aquí deberías llamar a tu API de extender. 
                // Por ahora simulamos éxito y refrescamos.
                Alert.alert("¡Éxito!", "Tiempo extendido 1 hora más."); 
                // ✅ 3. Al llamar a refresh(), el Dashboard vuelve a pedir datos y se actualizan las horas.
                if(refresh) refresh(); 
            }}
        ]);
    };
    const handleFinalize = async () => { Alert.alert("Finalizar Reserva", "¿Deseas liberar la cochera ahora?", [{ text: "No", style: "cancel" }, { text: "Sí, liberar", onPress: async () => { Alert.alert("Gracias", "Tu reserva ha finalizado."); }}]); };

    useEffect(() => {
        const interval = setInterval(() => {
            const nowTimestamp = Date.now(); // Hora del celular (milisegundos) para el contador
            
            // Para el contador regresivo, SÍ comparamos contra tiempo real.
            // Parseamos el string guardado para obtener su equivalente en milisegundos locales.
            const startTimestamp = new Date(item.start_time).getTime(); 
            const endTimestamp = new Date(item.end_time).getTime();
            
            if (isNaN(startTimestamp) || isNaN(endTimestamp)) return; 

            if (nowTimestamp < startTimestamp) {
                const diffStart = startTimestamp - nowTimestamp;
                const h = Math.floor(diffStart / (1000 * 60 * 60));
                const m = Math.floor((diffStart % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft(`Inicia en: ${h}h ${m}m`); setStatusLabel("Programada"); setIsUrgent(false); return;
            }
            const diffEnd = endTimestamp - nowTimestamp;
            if (diffEnd <= 0) {
                setTimeLeft("Finalizado"); setStatusLabel("Completada"); setIsUrgent(false); return;
            } 
            const h = Math.floor(diffEnd / (1000 * 60 * 60));
            const m = Math.floor((diffEnd % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diffEnd % (1000 * 60)) / 1000); 
            setTimeLeft(`Quedan: ${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`); setStatusLabel("En Curso");

            if (diffEnd <= 300000 && item.status === 'paid') { 
                setIsUrgent(true);
                if (!hasAlertedRef.current) { Vibration.vibrate(); hasAlertedRef.current = true; 
                    Alert.alert("⚠️ ¡Tiempo por agotarse!", "Te quedan menos de 5 minutos.\n¿Qué deseas hacer?", [{ text: "Liberar Cochera", style: "destructive", onPress: handleFinalize }, { text: "Extender (+1h)", onPress: handleExtend }, { text: "Entendido", style: "cancel" }]);
                }
            } else { setIsUrgent(false); }
        }, 1000); 
        return () => clearInterval(interval);
    }, [item, park]);

    return (
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('PagoQR', { res: item, parkingName: park?.name, lat: park?.lat, lng: park?.lng })}>
            <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 15, borderWidth: isUrgent ? 2 : 0, borderColor: isUrgent ? COLORS.danger : 'transparent' }}>
                <View style={{ flexDirection: 'row' }}>
                    {/* ✅ IMAGEN DINÁMICA AQUI */}
                    <Image source={getParkingImage(park)} style={{ width: 100, height: '100%' }} />
                    <View style={{ padding: 15, flex: 1 }}>
                        <Text style={styles.cardTitle}>{park?.name || "Cochera"}</Text>
                        <Text style={{ color: COLORS.textGray, fontSize: 12, marginBottom: 4 }}>{dateStr}</Text>
                        <Text style={{ color: COLORS.textWhite, fontSize: 13, marginBottom: 8, fontWeight: '500' }}>{scheduleStr}</Text>
                        {item.status === 'paid' && (
                            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 5}}>
                                <Clock size={14} color={isUrgent ? COLORS.danger : COLORS.success} />
                                <Text style={{ color: isUrgent ? COLORS.danger : COLORS.success, fontWeight: 'bold', marginLeft: 5, fontSize: 14 }}>{timeLeft}</Text>
                            </View>
                        )}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ color: COLORS.textWhite, fontWeight: 'bold', fontSize: 16 }}>S/ {item.total_amount}</Text>
                            <Badge text={item.status === 'paid' ? statusLabel : item.status} bg={item.status === 'paid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'} color={item.status === 'paid' ? COLORS.success : COLORS.warning} />
                        </View>
                    </View>
                </View>
                {isUrgent && (
                    <TouchableOpacity onPress={handleExtend} style={{backgroundColor: COLORS.danger, padding: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center'}}>
                        <AlertCircle size={16} color="white" style={{marginRight:5}}/>
                        <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>¡SE ACABA EL TIEMPO! TOCA PARA EXTENDER</Text>
                    </TouchableOpacity>
                )}
            </Card>
        </TouchableOpacity>
    );
};

function DashboardScreen() {
  const { user, getHeaders } = useAuth();
  const navigation = useNavigation();
  const [reservations, setReservations] = useState([]);
  const [parkings, setParkings] = useState([]);
  const fetchData = async () => {
    if(!user) return;
    try {
        const resPark = await fetch(`${API_URL}/parkings/`);
        const parkData = await resPark.json();
        setParkings(parkData);
        const resRes = await fetch(`${API_URL}/reservations/`, { headers: getHeaders() });
        const allReservations = await resRes.json();
        const myReservations = allReservations.filter(r => r.user_id === user.id);
        setReservations(myReservations.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))); 
    } catch(e) { console.log(e); }
  };
  useFocusEffect(useCallback(() => { fetchData(); }, [user]));
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Mis Reservas</Text></View>
      <FlatList data={reservations} keyExtractor={item => item.id.toString()} contentContainerStyle={{ padding: 24 }} renderItem={({item}) => <ReservationCard item={item} navigation={navigation} parkings={parkings} refresh={fetchData} />} ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 50 }}><Car size={48} color={COLORS.cardDark} /><Text style={{ color: COLORS.textGray, marginTop: 10 }}>No tienes reservas aún.</Text></View>} />
    </SafeAreaView>
  );
}

function PagoQRScreen({ route, navigation }) {
  const { res, parkingName, lat, lng } = route.params;
  const { user, getHeaders, refreshUser } = useAuth();
  const [showYapeModal, setShowYapeModal] = useState(false);
  const [yapeCode, setYapeCode] = useState('');
  const handlePayment = async (methodStr, code = null) => {
    try {
        if (methodStr === 'saldo') {
            const amount = parseFloat(res.total_amount);
            const balance = parseFloat(user.balance);
            if (balance < amount) { return Alert.alert("Saldo Insuficiente", `Saldo: S/ ${balance.toFixed(2)}\nCosto: S/ ${amount.toFixed(2)}\n\nPor favor recarga.`); }
        }
        const body = { method: methodStr };
        if(code) body.provider_ref = code;
        const response = await fetch(`${API_URL}/payments/pay-reservation/${res.id}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
        if(response.ok) { Alert.alert("¡Pago Exitoso!", "Tu reserva ha sido pagada."); await refreshUser(); navigation.goBack(); } else { const err = await response.json(); Alert.alert("Error", err.message || "Fallo al pagar"); }
    } catch(e) { Alert.alert("Error", "Error de conexión"); }
  };
  const verifyYape = () => { if (yapeCode !== '00000') { return Alert.alert("Error de Pago", "El código de operación es inválido (Usa '00000' para probar)."); } handlePayment('yape', yapeCode); };
  const openGPS = () => {
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const latLng = `${lat},${lng}`;
      const url = Platform.select({ ios: `${scheme}${parkingName}@${latLng}`, android: `${scheme}${latLng}(${parkingName})` });
      Linking.openURL(url);
  };
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgDark }}>
        <MapView style={{ flex: 1 }} initialRegion={{ latitude: lat || -16.4, longitude: lng || -71.5, latitudeDelta: 0.015, longitudeDelta: 0.015 }} customMapStyle={MAP_STYLE}>
            <Marker coordinate={{latitude: lat || -16.4, longitude: lng || -71.5}}><View style={[styles.marker, {backgroundColor: COLORS.danger}]}><Car size={14} color="white"/></View></Marker>
        </MapView>
        <View style={{position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.cardDark, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20}}>
            <Text style={styles.bsTitle}>Pago para {parkingName}</Text>
            <TouchableOpacity onPress={openGPS} style={[styles.btn, { backgroundColor: COLORS.info, marginBottom: 15 }]}>
                <Navigation size={20} color="white" style={{marginRight: 10}}/>
                <Text style={styles.btnText}>NAVEGAR CON GPS</Text>
            </TouchableOpacity>
            <View style={{alignItems: 'center', marginBottom: 20}}>
                <View style={{backgroundColor:'white', padding: 10, borderRadius: 10}}><QRCode value={`PAY:${res.id}`} size={120} /></View>
                <Text style={{color: COLORS.textWhite, fontSize: 20, fontWeight: 'bold', marginTop: 10}}>S/ {res.total_amount}</Text>
            </View>
            {res.status !== 'paid' ? (
                <>
                    <Text style={{color: COLORS.warning, textAlign:'center', marginBottom: 10}}>Estado: Pendiente</Text>
                    <Button text="PAGAR CON SALDO" onPress={() => handlePayment('saldo')} style={{marginBottom: 10}} />
                    <Button text="PAGAR CON YAPE" variant="outline" onPress={() => setShowYapeModal(true)} />
                </>
            ) : ( <View style={{flexDirection:'row', justifyContent:'center', backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: 10, borderRadius: 10}}><Text style={{color: COLORS.success, fontWeight:'bold'}}>PAGADO ✓ - PUEDES INGRESAR</Text></View> )}
            <Button text="VOLVER" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: 10 }} />
        </View>
        <Modal animationType="slide" transparent={true} visible={showYapeModal} onRequestClose={() => setShowYapeModal(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <TouchableOpacity style={{alignSelf:'flex-end'}} onPress={()=>setShowYapeModal(false)}><X color={COLORS.textGray}/></TouchableOpacity>
                    <Text style={styles.modalTitle}>Confirmar Yape</Text>
                    <Text style={{color: COLORS.textGray, marginBottom: 10}}>Ingresa el código de operación:</Text>
                    <TextInput style={styles.modalInput} placeholder="Ej: 123456" placeholderTextColor="#666" keyboardType="numeric" value={yapeCode} onChangeText={setYapeCode} />
                    <Button text="Confirmar Operación" onPress={verifyYape} />
                </View>
            </View>
        </Modal>
    </View>
  );
}

function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser, getHeaders } = useAuth();
  const [modalRecharge, setModalRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [modalEdit, setModalEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDni, setEditDni] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPlate, setEditPlate] = useState('');
  useFocusEffect(useCallback(() => { refreshUser(); }, []));
  const openEditModal = () => {
      setEditName(user.name || '');
      setEditEmail(user.email || '');
      setEditDni(user.dni || '');
      setEditPhone(user.phone || '');
      setEditPlate(user.plate || '');
      setModalEdit(true);
  };
  const handleRechargeSubmit = async () => {
      if(verificationCode !== '00000') return Alert.alert("Error", "Código de validación incorrecto.");
      const amount = parseFloat(rechargeAmount);
      if(isNaN(amount) || amount <= 0) return Alert.alert("Error", "Monto inválido");
      try {
          const newBalance = parseFloat(user.balance) + amount;
          const res = await fetch(`${API_URL}/users/${user.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ balance: newBalance }) });
          if(res.ok) { await refreshUser(); setModalRecharge(false); setRechargeAmount(''); setVerificationCode(''); Alert.alert("¡Recarga Exitosa!", `Saldo actual: S/ ${newBalance.toFixed(2)}`); }
      } catch(e) { Alert.alert("Error", "Fallo al recargar"); }
  };
  const handleSaveProfile = async () => {
      if(!editName.trim()) return Alert.alert("Error", "Nombre obligatorio");
      try {
          const res = await fetch(`${API_URL}/users/${user.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ name: editName, email: editEmail, dni: editDni, phone: editPhone, plate: editPlate }) });
          if(res.ok) { await refreshUser(); setModalEdit(false); Alert.alert("Actualizado", "Datos guardados."); }
      } catch(e) { Alert.alert("Error", "Fallo al guardar"); }
  }
  const handleLogout = () => { Alert.alert("Cerrar Sesión", "¿Seguro?", [{ text: "Cancelar", style: "cancel" }, { text: "Salir", style: "destructive", onPress: () => { logout(); navigation.replace('Login'); } }]); }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <Image source={user?.gender === 'woman' ? IMAGES.avatar_woman : IMAGES.avatar_man} style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary }} />
          <TouchableOpacity onPress={openEditModal} style={{flexDirection: 'row', alignItems: 'center', marginTop: 15}}><Text style={{ color: COLORS.textWhite, fontSize: 24, fontWeight: 'bold', marginRight: 8 }}>{user?.name}</Text><Edit size={18} color={COLORS.primary} /></TouchableOpacity>
          <Text style={{ color: COLORS.textGray }}>{user?.email}</Text>
        </View>
        <Card style={{ marginBottom: 20, backgroundColor: COLORS.primary }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View><Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>SALDO DISPONIBLE</Text><Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}>S/ {user?.balance ? parseFloat(user.balance).toFixed(2) : '0.00'}</Text></View>
            <TouchableOpacity onPress={() => setModalRecharge(true)} style={{ backgroundColor: 'white', padding: 10, borderRadius: 50 }}><Zap size={24} color={COLORS.primary} fill={COLORS.primary} /></TouchableOpacity>
          </View>
        </Card>
        <Card>
          <TouchableOpacity style={styles.profileRow} onPress={openEditModal}><User size={20} color={COLORS.textGray} /><Text style={styles.profileRowText}>Datos Personales</Text><ChevronRight size={20} color={COLORS.textGray} /></TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.profileRow} onPress={() => Linking.openURL('tel:+51999999999')}><Phone size={20} color={COLORS.textGray} /><Text style={styles.profileRowText}>Ayuda y Soporte</Text><ChevronRight size={20} color={COLORS.textGray} /></TouchableOpacity>
        </Card>
        <Button text="CERRAR SESIÓN" onPress={handleLogout} variant="danger" style={{ marginTop: 30 }} icon={<LogOut size={20} color="white" />} />
        
        <Modal animationType="slide" transparent={true} visible={modalRecharge} onRequestClose={() => setModalRecharge(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <TouchableOpacity style={{alignSelf:'flex-end'}} onPress={()=>setModalRecharge(false)}><X color={COLORS.textGray}/></TouchableOpacity>
                    <Text style={styles.modalTitle}>Recargar Saldo</Text>
                    <Text style={styles.label}>Monto (S/)</Text>
                    <TextInput style={styles.modalInput} placeholder="Monto (S/)" placeholderTextColor="#666" keyboardType="numeric" value={rechargeAmount} onChangeText={setRechargeAmount} />
                    <Text style={styles.label}>Código de Validación</Text>
                    <TextInput style={styles.modalInput} placeholder="Código secreto" placeholderTextColor="#666" secureTextEntry value={verificationCode} onChangeText={setVerificationCode} />
                    <Button text="Recargar Ahora" onPress={handleRechargeSubmit} />
                </View>
            </View>
        </Modal>

        <Modal animationType="slide" transparent={true} visible={modalEdit} onRequestClose={() => setModalEdit(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                <View style={[styles.modalContent, {maxHeight: '90%'}]}>
                    <Text style={styles.modalTitle}>Editar Datos</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Input label="Nombre" value={editName} onChangeText={setEditName} icon={<User size={18} color="#888"/>} />
                        <Input label="DNI" value={editDni} onChangeText={setEditDni} keyboardType="numeric" icon={<CreditCard size={18} color="#888"/>} />
                        <Input label="Celular" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" icon={<Phone size={18} color="#888"/>} />
                        <Input label="Placa" value={editPlate} onChangeText={setEditPlate} icon={<Car size={18} color="#888"/>} />
                        <Input label="Correo" value={editEmail} onChangeText={setEditEmail} icon={<Mail size={18} color="#888"/>} />
                    </ScrollView>
                    <View style={{flexDirection:'row', gap: 10, marginTop: 15}}>
                        <Button text="Cancelar" variant="outline" onPress={()=>setModalEdit(false)} style={{flex:1}}/>
                        <Button text="Guardar" onPress={handleSaveProfile} style={{flex:1}}/>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [parkings, setParkings] = useState([]);
  useFocusEffect(useCallback(() => { refreshUser(); fetch(`${API_URL}/parkings/`).then(r=>r.json()).then(data=>setParkings(data)).catch(e=>console.error(e)); }, []));
  const handleRegisterGarage = () => { Alert.alert("Registra tu Cochera", "Contáctanos:\n📞 +51 987 654 321", [{ text: "Llamar", onPress: () => Linking.openURL('tel:987654321') }, { text: "Cerrar" }]); }
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <View style={{ padding: 24, paddingTop: 60 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View><Text style={{ fontSize: 16, color: COLORS.textGray }}>Hola, {user?.name?.split(' ')[0]}</Text><View style={{flexDirection: 'row', alignItems: 'center'}}><Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.textWhite, marginRight: 8 }}>S/ {user?.balance ? parseFloat(user.balance).toFixed(2) : '0.00'}</Text><View style={{backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 6, borderRadius: 4}}><Text style={{color: COLORS.success, fontSize: 10, fontWeight:'bold'}}>SALDO</Text></View></View></View>
            <TouchableOpacity onPress={() => navigation.navigate('ProfileTab')}><Image source={user?.gender === 'woman' ? IMAGES.avatar_woman : IMAGES.avatar_man} style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: COLORS.primary }} /></TouchableOpacity>
          </View>
          <View style={styles.banner}>
            <View style={{ flex: 1 }}><Text style={styles.bannerTitle}>Tu cochera ideal</Text><Text style={{ color: '#cbd5e1', marginBottom: 15 }}>Reserva segura en todo Arequipa.</Text><TouchableOpacity onPress={() => navigation.navigate('MapaTab')} style={styles.bannerBtn}><Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>VER MAPA</Text></TouchableOpacity></View>
            <MapIcon size={80} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', right: -10, bottom: -10 }} />
          </View>
          <Text style={styles.sectionTitle}>Cocheras Disponibles</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
              {parkings.slice(0, 5).map(park => (
                  <TouchableOpacity key={park.id} style={{marginRight: 15, width: 140}} onPress={() => navigation.navigate('MapaTab', { parkingId: park.id })}>
                      {/* ✅ IMAGEN DINÁMICA AQUI */}
                      <Image source={getParkingImage(park)} style={{width: 140, height: 90, borderRadius: 12}} />
                      <Text style={{color: 'white', fontWeight: 'bold', marginTop: 5}} numberOfLines={1}>{park.name}</Text>
                      <Text style={{color: COLORS.textGray, fontSize: 12}}>{park.district}</Text>
                  </TouchableOpacity>
              ))}
          </ScrollView>
          <Text style={styles.sectionTitle}>Opciones</Text>
          <View style={{ gap: 15 }}>
            <View style={{ flexDirection: 'row', gap: 15 }}>
                <TouchableOpacity onPress={() => navigation.navigate('Manual')} style={styles.shortcut}><View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}><BookOpen color={COLORS.warning} size={28} /></View><Text style={styles.shortcutText}>Guía de Uso</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('PanelTab')} style={styles.shortcut}><View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}><QrCode color={COLORS.success} size={28} /></View><Text style={styles.shortcutText}>Mis Reservas</Text></TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleRegisterGarage} style={[styles.card, {flexDirection: 'row', alignItems: 'center', padding: 15}]}>
                <View style={[styles.iconBox, {backgroundColor: 'rgba(59, 130, 246, 0.1)'}]}><Briefcase color={COLORS.primary} size={24}/></View>
                <View style={{marginLeft: 15, flex: 1}}><Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>¿Tienes una cochera?</Text><Text style={{color: COLORS.textGray, fontSize: 12}}>Regístrate y empieza a ganar dinero</Text></View><ChevronRight color={COLORS.textGray}/>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ManualScreen() {
  const renderPaso = (icon, title, steps) => (
    <Card style={{ marginBottom: 15 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}><View style={{ backgroundColor: COLORS.inputBg, padding: 10, borderRadius: 10 }}>{icon}</View><Text style={[styles.cardTitle, { marginLeft: 15 }]}>{title}</Text></View>
      {steps.map((text, index) => (
        <View key={index} style={{ flexDirection: 'row', marginBottom: 8 }}><Text style={{ color: COLORS.primary, fontWeight: 'bold', marginRight: 10 }}>{index + 1}.</Text><Text style={{ color: COLORS.textGray, flex: 1, lineHeight: 20 }}>{text}</Text></View>
      ))}
    </Card>
  );
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.headerTitle}>Manual y Ayuda</Text>
        {renderPaso(<Car size={24} color={COLORS.primary} />, "Reservar Cochera", ["Abre el Mapa.", "Selecciona una cochera.", "Define hora y pago.", "Paga en el Panel."])}
        {renderPaso(<Zap size={24} color={COLORS.warning} />, "Recargar Saldo", ["Ve a tu Perfil.", "Toca el rayo.", "Elige monto."])}
      </ScrollView>
    </SafeAreaView>
  );
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarShowLabel: false, tabBarActiveTintColor: COLORS.primary, tabBarInactiveTintColor: COLORS.textGray, tabBarStyle: { backgroundColor: COLORS.bgDark, borderTopWidth: 0, elevation: 0, height: 90, paddingBottom: 20, paddingTop: 10 } }}>
      <Tab.Screen name="InicioTab" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <Home color={color} /> }} />
      <Tab.Screen name="MapaTab" component={MapScreen} options={{ tabBarIcon: ({ color }) => <MapIcon color={color} /> }} />
      <Tab.Screen name="PanelTab" component={DashboardScreen} options={{ tabBarIcon: ({ color }) => <View style={{ backgroundColor: COLORS.primary, padding: 12, borderRadius: 30, marginTop: -20, elevation: 5 }}><QrCode color="white" /></View> }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <User color={color} /> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  if (showSplash) { return <CustomSplashScreen onFinish={() => setShowSplash(false)} />; }
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="PagoQR" component={PagoQRScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="Manual" component={ManualScreen} options={{ headerShown: true, headerStyle: { backgroundColor: COLORS.bgDark }, headerTintColor: COLORS.textWhite, headerTitle: "Guía de Uso" }} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  loginContent: { flex: 1, justifyContent: 'center', padding: 24 },
  phoneFrame: { alignSelf: 'center', width: 120, height: 220, borderWidth: 6, borderColor: '#334155', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 30, backgroundColor: '#0f172a', position: 'relative' },
  phoneNotch: { position: 'absolute', top: 0, width: '40%', height: 12, backgroundColor: '#334155', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.textWhite, marginBottom: 5 },
  subtitle: { fontSize: 16, color: COLORS.textGray },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 'bold', color: COLORS.textGray, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 12, paddingHorizontal: 15, height: 56, borderWidth: 1, borderColor: COLORS.cardDark },
  input: { flex: 1, fontSize: 16, color: COLORS.textWhite, marginLeft: 10 },
  btn: { paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  btnText: { fontWeight: 'bold', fontSize: 16 },
  backBtn: { width: 40, height: 40, backgroundColor: COLORS.cardDark, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  searchBar: { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: COLORS.cardDark, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 56, zIndex: 10, shadowColor: '#000', shadowOpacity: 0.2, elevation: 10 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: 'white' },
  marker: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white', shadowColor: '#000', elevation: 5 },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.cardDark, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 0, overflow: 'hidden', elevation: 20 },
  sheetImage: { width: '100%', height: 150 },
  bsTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textWhite, marginBottom: 4 },
  bsSubtitle: { color: COLORS.textGray, fontSize: 14 }, 
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 },
  statItem: { backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 12, width: '48%', alignItems: 'center', justifyContent: 'center' },
  statValue: { color: COLORS.textWhite, fontWeight: 'bold', fontSize: 16, marginTop: 5 },
  statLabel: { color: COLORS.textGray, fontSize: 12, marginTop: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: COLORS.bgDark },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textWhite },
  card: { backgroundColor: COLORS.cardDark, borderRadius: 20, padding: 20, marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textWhite, marginBottom: 4 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  banner: { backgroundColor: COLORS.primary, borderRadius: 24, padding: 24, marginBottom: 30, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  bannerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', marginBottom: 5 },
  bannerBtn: { backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, alignSelf: 'flex-start' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textWhite, marginBottom: 15 },
  shortcut: { flex: 1, backgroundColor: COLORS.cardDark, padding: 16, borderRadius: 20, alignItems: 'center' },
  shortcutText: { fontWeight: 'bold', marginTop: 12, color: COLORS.textWhite },
  iconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  profileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  profileRowText: { color: COLORS.textWhite, fontSize: 16, flex: 1, marginLeft: 15 },
  divider: { height: 1, backgroundColor: COLORS.bgDark },
  avatarOption: { alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  avatarSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.cardDark },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { width: '85%', backgroundColor: COLORS.cardDark, padding: 20, borderRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textWhite, marginBottom: 10 },
  modalInput: { backgroundColor: COLORS.inputBg, color: 'white', padding: 15, borderRadius: 10, fontSize: 16, marginBottom: 20 },
  periodBtn: {flex: 1, backgroundColor: COLORS.inputBg, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  periodBtnActive: {backgroundColor: COLORS.primary},
  periodText: {color: COLORS.textGray, fontWeight: 'bold'},
  periodTextActive: {color: 'white'} 
});

const MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3c3c3c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];
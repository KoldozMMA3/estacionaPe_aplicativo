import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import {
  AlertTriangle,
  BookOpen,
  Briefcase,
  Car,
  ChevronRight,
  Clock,
  Edit,
  Globe,
  Heart,
  Home,
  Lock,
  LogOut,
  Mail,
  Map as MapIcon,
  Navigation, // Importado para el icono de navegar
  Phone,
  QrCode,
  Search,
  Smartphone,
  Star,
  User,
  X,
  Zap
} from 'lucide-react-native';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// --- COLORES ---
const COLORS = {
  bgDark: '#0f172a',
  cardDark: '#1e293b',
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  textWhite: '#f1f5f9',
  textGray: '#94a3b8',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#0ea5e9',
  inputBg: '#334155',
};

// --- IMÁGENES ---
const IMAGES = {
  splash1: { uri: 'https://images.unsplash.com/photo-1621929747188-b244589bc9c2?w=800&q=80' }, 
  splash2: { uri: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&q=80' },
  splash3: { uri: 'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=800&q=80' },
  logo: require('./assets/images/3a.png'), 
  avatar_man: { uri: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' },
  avatar_woman: { uri: 'https://cdn-icons-png.flaticon.com/512/4140/4140047.png' },
  parking1: { uri: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&q=80' },
  parking2: { uri: 'https://images.unsplash.com/photo-1470224114660-3f6686c562eb?w=800&q=80' },
};

// --- DATOS ---
const SEED_PARKINGS = [
  { id: "p1", name: "Cochera Centro", district: "Cercado", lat: -16.399, lng: -71.536, price: 5, capacity: 30, available: 12, hours: "06:00 - 23:00", promo: "-20% 2h", contact: "987654321", image: IMAGES.parking1, rating: 4.8 },
  { id: "p2", name: "Yanahuara Plaza", district: "Yanahuara", lat: -16.392, lng: -71.548, price: 6, capacity: 20, available: 0, hours: "07:00 - 22:00", promo: null, contact: "912345678", image: IMAGES.parking2, rating: 4.5 },
  { id: "p3", name: "Cayma Mall", district: "Cayma", lat: -16.363, lng: -71.548, price: 7, capacity: 50, available: 22, hours: "24 Horas", promo: "3x2", contact: "955554444", image: IMAGES.parking1, rating: 4.2 },
  { id: "p4", name: "Mall Aventura", district: "Porongoche", lat: -16.432, lng: -71.503, price: 4, capacity: 100, available: 55, hours: "08:00 - 22:00", promo: null, contact: "966665555", image: IMAGES.parking2, rating: 4.0 },
  { id: "p6", name: "Aeropuerto AQP", district: "Cerro Colorado", lat: -16.341, lng: -71.583, price: 8, capacity: 60, available: 43, hours: "24 Horas", promo: "-10% QR", contact: "977778888", image: IMAGES.parking1, rating: 4.7 },
];

const SEED_USERS = [
  { 
    id: "c1", 
    name: "Carlos Cliente", 
    email: "carlos@ep.pe", 
    role: "client", 
    password: "123", 
    balance: 45.50, 
    gender: 'man', 
    plate: 'V5X-123', 
    country: 'Perú', 
    city: 'Arequipa', 
    phone: '987654321', 
    favorites: [] 
  }
];

let DB = { parkings: [...SEED_PARKINGS], users: [...SEED_USERS], reservations: [] };

const api = {
  getParkings: () => DB.parkings,
  setParkings: (data) => { DB.parkings = data; },
  getUsers: () => DB.users,
  addUser: (user) => {
    const exists = DB.users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (!exists) { DB.users.push({ ...user, balance: 0, favorites: [] }); return true; }
    return false;
  },
  findUser: (email, password) => DB.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password),
  updateUser: (userId, newData) => {
    const index = DB.users.findIndex(u => u.id === userId);
    if (index !== -1) {
      DB.users[index] = { ...DB.users[index], ...newData };
      return DB.users[index];
    }
    return null;
  },
  updateUserBalance: (userId, amount) => {
    const user = DB.users.find(u => u.id === userId);
    if (user) user.balance += amount;
    return user;
  },
  toggleFavorite: (userId, parkingId) => {
    const userIndex = DB.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        let user = DB.users[userIndex];
        if (!user.favorites) user.favorites = [];
        
        if (user.favorites.includes(parkingId)) {
            user.favorites = user.favorites.filter(id => id !== parkingId); 
        } else {
            user.favorites.push(parkingId); 
        }
        DB.users[userIndex] = user; 
        return user;
    }
    return null;
  },
  getReservations: (userId) => userId ? DB.reservations.filter(r => r.userId === userId) : DB.reservations,
  addReservation: (res) => { DB.reservations.push(res); },
  updateReservation: (resId, update) => {
    DB.reservations = DB.reservations.map(r => r.id === resId ? { ...r, ...update } : r);
  },
  checkAvailability: (parkingId, time24h, duration) => {
      const [nh, nm] = time24h.split(':').map(Number);
      const newStart = nh * 60 + nm;
      const newEnd = newStart + (parseInt(duration) * 60);

      const conflict = DB.reservations.find(r => {
          if (r.parkingId !== parkingId || r.status === 'cancelado') return false;
          const [rh, rm] = r.time.split(':').map(Number);
          const rStart = rh * 60 + rm;
          const rEnd = rStart + (parseInt(r.duration) * 60);
          return (newStart < rEnd && newEnd > rStart);
      });
      return !conflict;
  }
};

// --- CONTEXTO AUTH ---
const AuthContext = createContext(null);
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const login = (u) => setUser(u);
  const logout = () => setUser(null);
  
  const refreshUser = () => {
    if (!user) return;
    const updated = DB.users.find(u => u.id === user.id);
    if (updated) {
        setUser({ ...updated }); 
    }
  }
  return <AuthContext.Provider value={{ user, login, logout, refreshUser }}>{children}</AuthContext.Provider>;
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
      <TextInput 
        style={styles.input} 
        value={value} 
        onChangeText={onChangeText} 
        placeholder={placeholder} 
        placeholderTextColor="#64748B" 
        secureTextEntry={secure} 
        autoCapitalize="none" 
        keyboardType={keyboardType} 
        maxLength={maxLength}
      />
    </View>
  </View>
);

const Card = ({ children, style }) => (<View style={[styles.card, style]}>{children}</View>);
const Badge = ({ text, color, bg }) => (<View style={[styles.badge, { backgroundColor: bg || '#334155' }]}><Text style={[styles.badgeText, { color: color || COLORS.textWhite }]}>{text}</Text></View>);

// --- SPLASH ---
function CustomSplashScreen({ onFinish }) {
  const [index, setIndex] = useState(0);
  const images = [IMAGES.splash1, IMAGES.splash2, IMAGES.splash3];
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
  const [email, setEmail] = useState('carlos@ep.pe');
  const [password, setPassword] = useState('123');
  const { login } = useAuth();

  const handleLogin = () => {
    const found = api.findUser(email.trim(), password);
    if (found) { login(found); navigation.replace('MainTabs'); }
    else { Alert.alert("Error", "Credenciales incorrectas."); }
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
          <Input label="Correo" placeholder="ej. carlos@ep.pe" value={email} onChangeText={setEmail} icon={<Mail size={20} color={COLORS.textGray} />} keyboardType="email-address" />
          <Input label="Contraseña" placeholder="••••••" value={password} onChangeText={setPassword} secure icon={<Lock size={20} color={COLORS.textGray} />} />
          <Button text="INICIAR SESIÓN" onPress={handleLogin} style={{ marginTop: 10 }} />
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
  const [gender, setGender] = useState('man');
  const { login } = useAuth();

  const handleRegister = () => {
    if (!name || !email || !password) { Alert.alert("Error", "Campos vacíos."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { Alert.alert("Error", "Ingresa un correo válido (ej: usuario@mail.com)"); return; }
    if (password.length < 6) { Alert.alert("Seguridad", "La contraseña debe tener al menos 6 caracteres."); return; }

    const cleanEmail = email.trim().toLowerCase();
    if (api.getUsers().find(u => u.email.toLowerCase() === cleanEmail)) { Alert.alert("Error", "Correo registrado."); return; }
    
    const u = { id: Date.now().toString(), name, email: cleanEmail, role: "client", password, gender, balance: 0, plate: '', country: 'Perú', city: 'Arequipa', phone: '', favorites: [] };
    api.addUser(u); login(u);
    Alert.alert("¡Éxito!", `Hola ${name}`, [{ text: "Vamos", onPress: () => navigation.replace('MainTabs') }]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ChevronRight color="white" size={24} style={{ transform: [{ rotate: '180deg' }] }} /></TouchableOpacity>
        <Text style={[styles.title, { marginBottom: 20 }]}>Crear{"\n"}Cuenta</Text>
        
        <Text style={styles.label}>Elige tu Avatar</Text>
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

        <Input label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" icon={<User size={20} color={COLORS.textGray} />} />
        <Input label="Correo" value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" icon={<Mail size={20} color={COLORS.textGray} />} keyboardType="email-address" />
        <Input label="Contraseña" value={password} onChangeText={setPassword} secure placeholder="Min. 6 caracteres" icon={<Lock size={20} color={COLORS.textGray} />} />
        <Button text="REGISTRARSE" onPress={handleRegister} style={{ marginTop: 20 }} />
      </View>
    </SafeAreaView>
  );
}

function MapScreen({ route }) {
  const [selected, setSelected] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [period, setPeriod] = useState('AM');
  const [duration, setDuration] = useState('1');
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  
  const [region, setRegion] = useState({ 
      latitude: -16.4090, 
      longitude: -71.5375, 
      latitudeDelta: 0.05, 
      longitudeDelta: 0.05 
  });

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'La ubicación es necesaria para ver cocheras cercanas.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    })();
  }, []);

  useEffect(() => {
    if (route.params?.parkingId) {
        const park = api.getParkings().find(p => p.id === route.params.parkingId);
        if (park) {
            setSelected(park);
            setRegion({
                latitude: park.lat,
                longitude: park.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
            });
        }
    }
  }, [route.params]);

  const filteredParkings = api.getParkings().filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Verificación reactiva de favoritos
  const isFavorite = selected && user?.favorites && user.favorites.includes(selected.id);
  
  const handleToggleFavorite = () => {
      if (!selected || !user) return; 
      api.toggleFavorite(user.id, selected.id);
      refreshUser(); 
  };

  const handleTimeChange = (text) => {
      const cleanText = text.replace(/[^0-9]/g, '');
      let formattedText = cleanText;
      if (cleanText.length > 2) {
          formattedText = cleanText.substring(0, 2) + ':' + cleanText.substring(2, 4);
      }
      setSelectedTime(formattedText);
  };

  const confirmReservation = (time24h, duration, method) => {
    const isAvailable = api.checkAvailability(selected.id, time24h, duration);
    if (!isAvailable) { 
        Alert.alert("Horario Ocupado", "La cochera ya tiene una reserva en ese rango."); 
        return; 
    }

    const totalAmount = selected.price * parseInt(duration);
    
    if(method === 'Saldo' && user.balance < totalAmount) {
        Alert.alert(
            "Saldo Insuficiente", 
            `Recargue su cuenta.\n\nNecesitas: S/ ${totalAmount}\nTienes: S/ ${user.balance.toFixed(2)}`,
            [
                {text: "Cancelar", style: "cancel"},
                {text: "Ir a Recargar", onPress: () => {
                    setModalVisible(false);
                    setSelected(null);
                    navigation.navigate('ProfileTab');
                }}
            ]
        );
        return;
    }

    if(method === 'Saldo') {
        api.updateUserBalance(user.id, -totalAmount);
    }

    const now = new Date();
    const [h, m] = time24h.split(':');
    const reserveDate = new Date(); 
    reserveDate.setHours(parseInt(h), parseInt(m), 0);
    
    const res = {
      id: Date.now().toString(),
      parkingId: selected.id,
      parkingName: selected.name,
      userId: user.id,
      status: method === 'Saldo' ? "pagado" : "pendiente",
      amount: totalAmount,
      createdAt: now.toISOString(),
      reserveDate: reserveDate.toISOString(),
      time: time24h, 
      duration: duration,
      method: method
    };
    
    api.addReservation(res);
    // Aquí actualizamos la disponibilidad en la DB local
    api.setParkings(api.getParkings().map(p => p.id === selected.id ? { ...p, available: p.available - 1 } : p));
    
    Alert.alert("¡Reserva Creada!", `Reservado por ${duration}h.`);
    setModalVisible(false);
    setSelected(null);
    navigation.navigate('PanelTab');
  };

  const handleReservePress = () => {
    if (!selected || selected.available === 0) return;
    if (user.role !== 'client') { Alert.alert("Acceso", "Solo clientes pueden reservar."); return; }
    setSelectedTime(''); 
    setDuration('1');
    setPeriod('AM');
    setModalVisible(true);
  };

  const handleTimeSubmit = () => {
      const timeRegex = /^(0[1-9]|1[0-2]):[0-5][0-9]$/;
      if(!timeRegex.test(selectedTime)) { Alert.alert("Hora Inválida", "Ingresa una hora entre 01:00 y 12:59"); return; }
      
      const dur = parseInt(duration);
      if(isNaN(dur) || dur < 1) { Alert.alert("Error", "Duración inválida"); return; }

      let [h, m] = selectedTime.split(':').map(Number);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      
      const time24h = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      const now = new Date(); 
      const checkDate = new Date(); 
      checkDate.setHours(h, m, 0); 

      if (checkDate < now) {
        Alert.alert("Hora inválida", "La hora seleccionada ya pasó. Elige una hora futura para hoy.");
        return;
      }

      Alert.alert(
        "Método de Pago",
        `Total: S/ ${(selected.price * dur).toFixed(2)}\n¿Cómo deseas pagar?`,
        [
          { text: "Saldo App", onPress: () => confirmReservation(time24h, dur, "Saldo") },
          { text: "Yape / Plin", onPress: () => confirmReservation(time24h, dur, "Yape") },
          { text: "Cancelar", style: "cancel" }
        ]
      );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgDark }}>
      <StatusBar barStyle="light-content" />
      <View style={styles.searchBar}>
        <Search color={COLORS.textGray} size={20} />
        <TextInput placeholder="Buscar cochera..." style={styles.searchInput} placeholderTextColor={COLORS.textGray} value={searchTerm} onChangeText={setSearchTerm} />
      </View>
      <MapView 
        style={{ flex: 1 }} 
        region={region}
        showsUserLocation={true}
        onPress={() => setSelected(null)} 
        userInterfaceStyle="dark" 
        customMapStyle={MAP_STYLE}
        provider={Platform.OS === 'android' ? undefined : undefined} 
      >
        {filteredParkings.map(p => (
          <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} onPress={(e) => { e.stopPropagation(); setSelected(p); }}>
            {/* CORRECCIÓN DE CRASH: Usamos un View simple con texto en lugar de SVG complejo */}
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
          <Image source={selected.image} style={styles.sheetImage} />
          <View style={{ padding: 20 }}>
            {/* Cabecera del Bottom Sheet */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
              <View style={{ flex: 1 }}>
                  <Text style={styles.bsTitle}>{selected.name}</Text>
                  <Text style={styles.bsSubtitle}>{selected.district}</Text>
              </View>
              <TouchableOpacity onPress={handleToggleFavorite} style={{marginTop: 5}}>
                   <Heart size={28} color={isFavorite ? COLORS.danger : COLORS.textGray} fill={isFavorite ? COLORS.danger : 'transparent'} />
              </TouchableOpacity>
            </View>

            {/* SECCIÓN DE INFORMACIÓN DETALLADA */}
            <View style={styles.statsGrid}>
                {/* Calificación */}
                <View style={styles.statItem}>
                    <Star size={18} color={COLORS.warning} fill={COLORS.warning} />
                    <Text style={styles.statValue}>{selected.rating}</Text>
                    <Text style={styles.statLabel}>Calificación</Text>
                </View>
                {/* Horario */}
                <View style={styles.statItem}>
                    <Clock size={18} color={COLORS.primary} />
                    <Text style={styles.statValue} numberOfLines={1}>{selected.hours.split(' - ')[0]}</Text>
                    <Text style={styles.statLabel}>Apertura</Text>
                </View>
                {/* Espacios Libres */}
                <View style={styles.statItem}>
                    <Car size={18} color={selected.available > 0 ? COLORS.success : COLORS.danger} />
                    <Text style={[styles.statValue, {color: selected.available > 0 ? COLORS.success : COLORS.danger}]}>{selected.available}</Text>
                    <Text style={styles.statLabel}>Espacios Libres</Text>
                </View>
                {/* Costo */}
                <View style={styles.statItem}>
                    <Text style={{fontSize: 18, fontWeight: 'bold', color: COLORS.textWhite}}>S/ {selected.price}</Text>
                    <Text style={styles.statLabel}>Por Hora</Text>
                </View>
            </View>

            <Button text="RESERVAR AHORA" onPress={handleReservePress} disabled={selected.available === 0} style={{marginTop: 15}}/>
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
                
                <Text style={{color: COLORS.textGray, marginBottom: 5}}>Hora de llegada (12h)</Text>
                <View style={{flexDirection: 'row', gap: 10}}>
                    <TextInput 
                        style={[styles.modalInput, {flex: 2}]} 
                        placeholder="Ej: 0430" 
                        placeholderTextColor="#666" 
                        value={selectedTime} 
                        onChangeText={handleTimeChange} 
                        keyboardType="number-pad"
                        maxLength={5}
                    />
                    <TouchableOpacity onPress={() => setPeriod('AM')} style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]}>
                        <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setPeriod('PM')} style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]}>
                        <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>PM</Text>
                    </TouchableOpacity>
                </View>

                <Text style={{color: COLORS.textGray, marginBottom: 5, marginTop: 10}}>Duración (Horas)</Text>
                <TextInput style={styles.modalInput} placeholder="1" placeholderTextColor="#666" value={duration} onChangeText={setDuration} keyboardType="numeric"/>
                <Button text="Continuar" onPress={handleTimeSubmit} style={{marginTop: 10}}/>
            </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const ReservationCard = ({ item, navigation }) => {
    const park = api.getParkings().find(p => p.id === item.parkingId);
    const { user, refreshUser } = useAuth();
    const [timeLeft, setTimeLeft] = useState('');
    const [urgent, setUrgent] = useState(false);
    
    // Verificamos si está en favoritos del usuario
    const isFav = user?.favorites?.includes(item.parkingId);

    const toggleCardFav = () => {
        api.toggleFavorite(user.id, item.parkingId);
        refreshUser(); // Actualiza inmediatamente el corazón
    };

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const [h, m] = item.time.split(':');
            const endTime = new Date();
            endTime.setHours(parseInt(h) + parseInt(item.duration), parseInt(m), 0);
            
            const diff = endTime - now;
            
            if (diff <= 0) {
                setTimeLeft("Finalizado");
                setUrgent(false);
            } else {
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                setTimeLeft(`${hours}h ${minutes}m restantes`);
                if (hours === 0 && minutes < 5) {
                    setUrgent(true);
                } else {
                    setUrgent(false);
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [item]);

    const handleExtend = () => {
        Alert.alert("Extender Tiempo", "Añadir 30 minutos por S/ 2.50?", [
            { text: "Cancelar" },
            { text: "Aceptar", onPress: () => Alert.alert("Tiempo Extendido", "Se ha actualizado tu reserva.") }
        ]);
    };

    return (
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('PagoQR', { res: item })}>
            <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 15, borderColor: urgent ? COLORS.danger : 'transparent', borderWidth: urgent ? 2 : 0 }}>
                {urgent && item.status === 'pagado' && (
                    <View style={{backgroundColor: COLORS.danger, padding: 5, alignItems: 'center', flexDirection: 'row', justifyContent: 'center'}}>
                        <AlertTriangle size={14} color="white" />
                        <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12, marginLeft: 5}}>¡TIEMPO POR AGOTARSE!</Text>
                    </View>
                )}

                <View style={{ flexDirection: 'row' }}>
                    <Image source={park?.image || IMAGES.parking1} style={{ width: 100, height: '100%' }} />
                    <View style={{ padding: 15, flex: 1 }}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                            <Text style={styles.cardTitle}>{park?.name}</Text>
                            <TouchableOpacity onPress={toggleCardFav}>
                                <Heart size={20} color={isFav ? COLORS.danger : COLORS.textGray} fill={isFav ? COLORS.danger : 'transparent'} />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={{ color: COLORS.textGray, fontSize: 12, marginBottom: 8 }}>{item.time} ({item.duration}h) • {item.method}</Text>
                        
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ color: COLORS.textWhite, fontWeight: 'bold', fontSize: 16 }}>S/ {item.amount}.00</Text>
                            <Badge text={item.status} bg={item.status === 'pagado' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'} color={item.status === 'pagado' ? COLORS.success : COLORS.warning} />
                        </View>

                        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                             <View style={{flexDirection:'row', alignItems:'center'}}>
                                <Clock size={14} color={urgent ? COLORS.danger : COLORS.textGray} />
                                <Text style={{color: urgent ? COLORS.danger : COLORS.textGray, marginLeft: 5, fontSize: 12, fontWeight: urgent?'bold':'normal'}}>{timeLeft}</Text>
                             </View>
                             {urgent && item.status === 'pagado' && (
                                 <TouchableOpacity onPress={handleExtend} style={{backgroundColor: COLORS.danger, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4}}>
                                     <Text style={{color: 'white', fontSize: 10, fontWeight: 'bold'}}>EXTENDER</Text>
                                 </TouchableOpacity>
                             )}
                        </View>
                    </View>
                </View>
            </Card>
        </TouchableOpacity>
    );
};

function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [data, setData] = useState([]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => setData([...api.getReservations(user.id)]));
    return unsub;
  }, [navigation, user]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Mis Reservas</Text></View>
      <FlatList 
        data={data} 
        keyExtractor={item => item.id} 
        contentContainerStyle={{ padding: 24 }} 
        renderItem={({item}) => <ReservationCard item={item} navigation={navigation} />} 
        ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 50 }}><Car size={48} color={COLORS.cardDark} /><Text style={{ color: COLORS.textGray, marginTop: 10 }}>No tienes reservas aún.</Text></View>} 
      />
    </SafeAreaView>
  );
}

function PagoQRScreen({ route, navigation }) {
  const { res } = route.params;
  const { user, refreshUser } = useAuth();
  const [location, setLocation] = useState(null);
  
  const [showYapeModal, setShowYapeModal] = useState(false);
  const [yapeCode, setYapeCode] = useState('');
  const park = api.getParkings().find(p => p.id === res.parkingId);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      // Obtener ubicación inicial rápidamente
      let initialLoc = await Location.getCurrentPositionAsync({});
      setLocation(initialLoc.coords);

      const interval = setInterval(async () => {
          let loc = await Location.getCurrentPositionAsync({});
          setLocation(loc.coords);
      }, 5000);
      return () => clearInterval(interval);
    })();
  }, []);

  // Función para abrir GPS externo (Solución para "ruta rápida por calles")
  const openGPS = () => {
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const latLng = `${park.lat},${park.lng}`;
      const label = park.name;
      const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`
      });
      Linking.openURL(url);
  };

  const handlePayment = () => {
    if (res.method === 'Yape') {
       setShowYapeModal(true);
       return;
    }
    if (res.method === 'Saldo') {
      if (user.balance < res.amount) { Alert.alert("Error", "Saldo insuficiente."); return; }
      api.updateUserBalance(user.id, -res.amount);
      refreshUser();
      api.updateReservation(res.id, { status: 'pagado' });
      Alert.alert("¡Pago Exitoso!", "Tu reserva ha sido pagada.");
    }
  };

  const verifyYapeCode = () => {
      if(yapeCode === '00000') {
          api.updateReservation(res.id, { status: 'pagado' });
          setShowYapeModal(false);
          Alert.alert("¡Pago Confirmado!", "Tu reserva está pagada.", [{ text: "Ok", onPress: () => navigation.goBack() }]);
      } else {
          Alert.alert("Error", "Código de operación incorrecto.");
      }
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bgDark }}>
        <MapView 
            style={{ flex: 1 }} 
            initialRegion={{ latitude: park.lat, longitude: park.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 }}
            showsUserLocation={true} 
            customMapStyle={MAP_STYLE}
        >
            <Marker coordinate={{latitude: park.lat, longitude: park.lng}}>
                <View style={[styles.marker, {backgroundColor: COLORS.danger}]}><Car size={14} color="white"/></View>
            </Marker>
            {/* Dibujamos la línea recta como referencia visual en el mapa interno */}
            {location && (
                <Polyline 
                    coordinates={[{latitude: location.latitude, longitude: location.longitude}, {latitude: park.lat, longitude: park.lng}]} 
                    strokeColor={COLORS.primary} 
                    strokeWidth={4} 
                    lineDashPattern={[1]} // Hacemos la línea punteada para indicar que es referencial
                />
            )}
        </MapView>
        <View style={{position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.cardDark, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20}}>
            <Text style={styles.bsTitle}>Ruta a {park.name}</Text>
            
            {/* Botón añadido para solucionar el problema de la ruta */}
            <TouchableOpacity onPress={openGPS} style={[styles.btn, { backgroundColor: COLORS.info, marginBottom: 15 }]}>
                <Navigation size={20} color="white" style={{marginRight: 10}}/>
                <Text style={styles.btnText}>NAVEGAR CON GPS (Waze/Maps)</Text>
            </TouchableOpacity>

            <View style={{alignItems: 'center', marginBottom: 20}}>
                <View style={{backgroundColor:'white', padding: 10, borderRadius: 10}}>
                    <QRCode value={`PAY:${res.id}`} size={120} />
                </View>
                <Text style={{color: COLORS.textWhite, fontSize: 20, fontWeight: 'bold', marginTop: 10}}>S/ {res.amount}.00</Text>
            </View>
            {res.status === 'pendiente' ? (
                <>
                    <Text style={{color: COLORS.warning, textAlign:'center', marginBottom: 10}}>Estado: Pendiente de Pago</Text>
                    <Button text={`VALIDAR PAGO (${res.method})`} onPress={handlePayment} />
                </>
            ) : (
                <View style={{flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: 10, borderRadius: 10}}>
                    <Text style={{color: COLORS.success, fontWeight:'bold'}}>PAGADO ✓ - PUEDES INGRESAR</Text>
                </View>
            )}
            <Button text="VOLVER" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: 10 }} />
        </View>
        <Modal animationType="slide" transparent={true} visible={showYapeModal} onRequestClose={() => setShowYapeModal(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <TouchableOpacity style={{alignSelf:'flex-end'}} onPress={()=>setShowYapeModal(false)}><X color={COLORS.textGray}/></TouchableOpacity>
                    <Text style={styles.modalTitle}>Confirmar Yape</Text>
                    <Text style={{color: COLORS.textGray, marginBottom: 10}}>Ingresa el código de operación del comprobante:</Text>
                    <TextInput style={styles.modalInput} placeholder="Ej: 123456" placeholderTextColor="#666" keyboardType="numeric" value={yapeCode} onChangeText={setYapeCode} />
                    <Button text="Confirmar Operación" onPress={verifyYapeCode} />
                </View>
            </View>
        </Modal>
    </View>
  );
}

function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();
  const [modalRecharge, setModalRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  
  const [modalEdit, setModalEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPlate, setEditPlate] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const openEditModal = () => {
      setEditName(user.name || '');
      setEditPlate(user.plate || '');
      setEditCountry(user.country || '');
      setEditCity(user.city || '');
      setEditEmail(user.email || '');
      setEditPhone(user.phone || '');
      setModalEdit(true);
  };

  const handleRechargeSubmit = () => {
      if(verificationCode !== '00000') { Alert.alert("Error", "Código de verificación incorrecto."); return; }
      const amount = parseFloat(rechargeAmount);
      if(isNaN(amount) || amount <= 0) { Alert.alert("Error", "Monto inválido"); return; }
      api.updateUserBalance(user.id, amount);
      refreshUser();
      setModalRecharge(false);
      setRechargeAmount('');
      setVerificationCode('');
      Alert.alert("¡Recarga Exitosa!", `Se han añadido S/ ${amount} a tu cuenta.`);
  };

  const handleSaveProfile = () => {
      if(!editName.trim() || !editEmail.trim()) { Alert.alert("Error", "Nombre y Correo son obligatorios"); return; }
      api.updateUser(user.id, { 
          name: editName,
          plate: editPlate,
          country: editCountry,
          city: editCity,
          email: editEmail,
          phone: editPhone
      });
      refreshUser();
      setModalEdit(false);
      Alert.alert("Actualizado", "Tus datos se guardaron correctamente.");
  }

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Seguro que quieres salir?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Salir", style: "destructive", onPress: () => { logout(); navigation.replace('Login'); } }
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <Image source={user.gender === 'woman' ? IMAGES.avatar_woman : IMAGES.avatar_man} style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primary }} />
          <TouchableOpacity onPress={openEditModal} style={{flexDirection: 'row', alignItems: 'center', marginTop: 15}}>
             <Text style={{ color: COLORS.textWhite, fontSize: 24, fontWeight: 'bold', marginRight: 8 }}>{user?.name}</Text>
             <Edit size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={{ color: COLORS.textGray }}>{user?.email}</Text>
        </View>

        <Card style={{ marginBottom: 20, backgroundColor: COLORS.primary }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>SALDO DISPONIBLE</Text>
              <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}>S/ {user?.balance?.toFixed(2)}</Text>
            </View>
            <TouchableOpacity onPress={() => setModalRecharge(true)} style={{ backgroundColor: 'white', padding: 10, borderRadius: 50 }}>
              <Zap size={24} color={COLORS.primary} fill={COLORS.primary} />
            </TouchableOpacity>
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
                    <Text style={styles.label}>Código de Verificación</Text>
                    <TextInput style={styles.modalInput} placeholder="XXXXX" placeholderTextColor="#666" keyboardType="numeric" secureTextEntry value={verificationCode} onChangeText={setVerificationCode} />
                    <Button text="Recargar Ahora" onPress={handleRechargeSubmit} />
                </View>
            </View>
        </Modal>

        <Modal animationType="slide" transparent={true} visible={modalEdit} onRequestClose={() => setModalEdit(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                <View style={[styles.modalContent, {maxHeight: '90%'}]}>
                    <Text style={styles.modalTitle}>Editar Datos</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Input label="Nombre Completo" value={editName} onChangeText={setEditName} icon={<User size={18} color="#888"/>} />
                        <Input label="Placa del Auto" value={editPlate} onChangeText={setEditPlate} icon={<Car size={18} color="#888"/>} />
                        <Input label="País" value={editCountry} onChangeText={setEditCountry} icon={<Globe size={18} color="#888"/>} />
                        <Input label="Ciudad" value={editCity} onChangeText={setEditCity} icon={<MapIcon size={18} color="#888"/>} />
                        <Input label="Correo" value={editEmail} onChangeText={setEditEmail} icon={<Mail size={18} color="#888"/>} />
                        <Input label="Celular" value={editPhone} onChangeText={setEditPhone} icon={<Smartphone size={18} color="#888"/>} keyboardType="phone-pad"/>
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
  const { user } = useAuth();
  
  // Filtro de favoritos (Ahora se actualiza automáticamente gracias a refreshUser)
  const favoriteParkings = api.getParkings().filter(p => user?.favorites?.includes(p.id));

  const handleRegisterGarage = () => {
      Alert.alert(
          "Registra tu Cochera", 
          "Contáctanos para empezar a ganar dinero con tu espacio libre.\n\n📞 +51 987 654 321\n📧 socios@estacionape.com",
          [
              { text: "Llamar", onPress: () => Linking.openURL('tel:987654321') },
              { text: "Cerrar" }
          ]
      );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <View style={{ padding: 24, paddingTop: 60 }}>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <View>
              <Text style={{ fontSize: 16, color: COLORS.textGray }}>Hola, {user?.name?.split(' ')[0]}</Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.textWhite, marginRight: 8 }}>S/ {user?.balance?.toFixed(2)}</Text>
                  <View style={{backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 6, borderRadius: 4}}>
                      <Text style={{color: COLORS.success, fontSize: 10, fontWeight:'bold'}}>SALDO</Text>
                  </View>
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ProfileTab')}>
              <Image source={user.gender === 'woman' ? IMAGES.avatar_woman : IMAGES.avatar_man} style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: COLORS.primary }} />
            </TouchableOpacity>
          </View>

          <View style={styles.banner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Tu cochera ideal</Text>
              <Text style={{ color: '#cbd5e1', marginBottom: 15 }}>Reserva segura en todo Arequipa.</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MapaTab')} style={styles.bannerBtn}>
                <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>VER MAPA</Text>
              </TouchableOpacity>
            </View>
            <MapIcon size={80} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', right: -10, bottom: -10 }} />
          </View>

          {/* FAVORITOS */}
          {favoriteParkings.length > 0 ? (
              <View style={{marginBottom: 20}}>
                  <Text style={styles.sectionTitle}>Tus Favoritos</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {favoriteParkings.map(park => (
                          <TouchableOpacity 
                            key={park.id} 
                            style={{marginRight: 15, width: 140}}
                            onPress={() => navigation.navigate('MapaTab', { parkingId: park.id })}
                          >
                              <Image source={park.image} style={{width: 140, height: 90, borderRadius: 12}} />
                              <Text style={{color: 'white', fontWeight: 'bold', marginTop: 5}} numberOfLines={1}>{park.name}</Text>
                              <Text style={{color: COLORS.textGray, fontSize: 12}}>{park.district}</Text>
                          </TouchableOpacity>
                      ))}
                  </ScrollView>
              </View>
          ) : (
            <View style={{marginBottom: 20}}>
               <Text style={styles.sectionTitle}>Tus Favoritos</Text>
               <Text style={{color: COLORS.textGray, fontSize: 12}}>Aún no tienes favoritos. Dale ❤️ en el mapa.</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Opciones</Text>
          <View style={{ gap: 15 }}>
            <View style={{ flexDirection: 'row', gap: 15 }}>
                <TouchableOpacity onPress={() => navigation.navigate('Manual')} style={styles.shortcut}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}><BookOpen color={COLORS.warning} size={28} /></View>
                <Text style={styles.shortcutText}>Guía de Uso</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('PanelTab')} style={styles.shortcut}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}><QrCode color={COLORS.success} size={28} /></View>
                <Text style={styles.shortcutText}>Mis Reservas</Text>
                </TouchableOpacity>
            </View>
            
            <TouchableOpacity onPress={handleRegisterGarage} style={[styles.card, {flexDirection: 'row', alignItems: 'center', padding: 15}]}>
                <View style={[styles.iconBox, {backgroundColor: 'rgba(59, 130, 246, 0.1)'}]}>
                    <Briefcase color={COLORS.primary} size={24}/>
                </View>
                <View style={{marginLeft: 15, flex: 1}}>
                    <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>¿Tienes una cochera?</Text>
                    <Text style={{color: COLORS.textGray, fontSize: 12}}>Regístrate y empieza a ganar dinero</Text>
                </View>
                <ChevronRight color={COLORS.textGray}/>
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
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
        <View style={{ backgroundColor: COLORS.inputBg, padding: 10, borderRadius: 10 }}>{icon}</View>
        <Text style={[styles.cardTitle, { marginLeft: 15 }]}>{title}</Text>
      </View>
      {steps.map((text, index) => (
        <View key={index} style={{ flexDirection: 'row', marginBottom: 8 }}>
          <Text style={{ color: COLORS.primary, fontWeight: 'bold', marginRight: 10 }}>{index + 1}.</Text>
          <Text style={{ color: COLORS.textGray, flex: 1, lineHeight: 20 }}>{text}</Text>
        </View>
      ))}
    </Card>
  );
  
  const callSupport = () => {
      Linking.openURL('tel:999888777');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.headerTitle}>Manual y Ayuda</Text>
        <Text style={{ color: COLORS.textGray, marginBottom: 20 }}>Guía rápida.</Text>
        {renderPaso(<Car size={24} color={COLORS.primary} />, "Reservar Cochera", ["Abre el Mapa.", "Selecciona una cochera.", "Define hora y método de pago.", "Paga en el Panel."])}
        {renderPaso(<Zap size={24} color={COLORS.warning} />, "Recargar Saldo", ["Ve a tu Perfil.", "Toca el rayo en la tarjeta azul.", "Elige el monto y confirma."])}
        
        <TouchableOpacity onPress={callSupport} style={[styles.btn, {backgroundColor: COLORS.cardDark, marginTop: 20}]}>
            <Phone color={COLORS.primary} style={{marginRight: 10}}/>
            <Text style={{color: 'white', fontWeight: 'bold'}}>Llamar a Soporte Técnico</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- NAVEGACIÓN ---
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false, 
        tabBarShowLabel: false, 
        tabBarActiveTintColor: COLORS.primary, 
        tabBarInactiveTintColor: COLORS.textGray, 
        tabBarStyle: { 
            backgroundColor: COLORS.bgDark, 
            borderTopWidth: 0, 
            elevation: 0, 
            height: 90, // AUMENTADO: de 70 a 90 para que sea más grande
            paddingBottom: 20, // AUMENTADO: más espacio abajo para que no se pegue
            paddingTop: 10
        } 
      }}
    >
      <Tab.Screen name="InicioTab" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <Home color={color} /> }} />
      <Tab.Screen name="MapaTab" component={MapScreen} options={{ tabBarIcon: ({ color }) => <MapIcon color={color} /> }} />
      <Tab.Screen name="PanelTab" component={DashboardScreen} options={{ tabBarIcon: ({ color }) => <View style={{ backgroundColor: COLORS.primary, padding: 12, borderRadius: 30, marginTop: -20, elevation: 5 }}><QrCode color="white" /></View> }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <User color={color} /> }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  
  if (showSplash) return <CustomSplashScreen onFinish={() => setShowSplash(false)} />;
  
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

// --- ESTILOS ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  loginContent: { flex: 1, justifyContent: 'center', padding: 24 },
  
  phoneFrame: {
      alignSelf: 'center',
      width: 120,
      height: 220,
      borderWidth: 6,
      borderColor: '#334155',
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 30,
      backgroundColor: '#0f172a',
      position: 'relative'
  },
  phoneNotch: {
      position: 'absolute',
      top: 0,
      width: '40%',
      height: 12,
      backgroundColor: '#334155',
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
  },

  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.textWhite, marginBottom: 5 },
  subtitle: { fontSize: 16, color: COLORS.textGray },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 'bold', color: COLORS.textGray, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 12, paddingHorizontal: 15, height: 56, borderWidth: 1, borderColor: COLORS.cardDark },
  input: { flex: 1, fontSize: 16, color: COLORS.textWhite, marginLeft: 10 },
  btn: { paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  btnText: { fontWeight: 'bold', fontSize: 16 },
  smBtn: { flexDirection: 'row', padding: 10, borderRadius: 8, alignItems: 'center' },
  backBtn: { width: 40, height: 40, backgroundColor: COLORS.cardDark, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  searchBar: { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: COLORS.cardDark, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 56, zIndex: 10, shadowColor: '#000', shadowOpacity: 0.2, elevation: 10 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: 'white' },
  marker: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white', shadowColor: '#000', elevation: 5 },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.cardDark, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 0, overflow: 'hidden', elevation: 20 },
  sheetImage: { width: '100%', height: 150 },
  bsTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textWhite, marginBottom: 4 },
  bsSubtitle: { color: COLORS.textGray, fontSize: 14 },
  
  // NUEVOS ESTILOS PARA EL GRID DE ESTADÍSTICAS
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 },
  statItem: { backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 12, width: '48%', alignItems: 'center', justifyContent: 'center' },
  statValue: { color: COLORS.textWhite, fontWeight: 'bold', fontSize: 16, marginTop: 5 },
  statLabel: { color: COLORS.textGray, fontSize: 12, marginTop: 2 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: COLORS.bgDark },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textWhite },
  logoutBtn: { padding: 10, backgroundColor: COLORS.cardDark, borderRadius: 12 },
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
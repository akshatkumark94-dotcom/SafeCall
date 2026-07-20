import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { useScamStore } from '../store/useScamStore';

export default function CommunityScreen({ BACKEND_URL }) {
  const communityReports = useScamStore((state) => state.communityReports);
  const stats = useScamStore((state) => state.stats);
  const fetchCommunityReports = useScamStore((state) => state.fetchCommunityReports);
  const submitReport = useScamStore((state) => state.submitCommunityReport);

  // Search Verification
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Form Fields
  const [scamValue, setScamValue] = useState('');
  const [type, setType] = useState('phone'); // 'phone' | 'upi' | 'website' | 'other'
  const [scamCategory, setScamCategory] = useState('Digital Arrest');
  const [description, setDescription] = useState('');
  const [submitStatus, setSubmitStatus] = useState(null);

  useEffect(() => {
    fetchCommunityReports(BACKEND_URL);
  }, []);

  const handleVerify = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/community/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await response.json();
      setSearchResult(data);
    } catch (err) {
      console.error(err);
      setSearchResult({ success: false, message: 'Verification lookup failed.' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!scamValue.trim() || !type) {
      setSubmitStatus({ success: false, message: 'Indicator value is required.' });
      return;
    }

    setSubmitStatus(null);
    const res = await submitReport(BACKEND_URL, {
      scamValue: scamValue.trim(),
      type,
      scamCategory,
      description,
      reporterName: 'Anonymous Citizen'
    });

    if (res.success) {
      setSubmitStatus({ success: true, message: 'Thank you. Record successfully added to public safety index.' });
      setScamValue('');
      setDescription('');
    } else {
      setSubmitStatus({ success: false, message: res.error || 'Failed to submit report.' });
    }
  };

  const renderScamItem = ({ item }) => {
    const icon = item.type === 'phone' ? '📞' : item.type === 'upi' ? '💳' : item.type === 'website' ? '🌐' : '🛑';
    return (
      <View style={styles.scamCard}>
        <View style={styles.scamCardTop}>
          <Text style={styles.scamIconText}>{icon}</Text>
          <View style={styles.scamInfo}>
            <Text style={styles.scamValText}>{item.scamValue}</Text>
            <Text style={styles.scamCatText}>{item.scamCategory} • {item.type.toUpperCase()}</Text>
          </View>
        </View>
        {item.description ? (
          <Text style={styles.scamDescText}>{item.description}</Text>
        ) : null}
        <Text style={styles.scamDateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Scam Registry</Text>
        <Text style={styles.subtitle}>Collaborative Public Safety Database</Text>
      </View>

      {/* Database Quick Stats */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>GLOBAL INDEX METRICS</Text>
        <View style={styles.statsRow}>
          <View style={styles.statMini}>
            <Text style={styles.statMiniNum}>{stats.byType?.phone || 0}</Text>
            <Text style={styles.statMiniLabel}>📞 Phone</Text>
          </View>
          <View style={styles.statMini}>
            <Text style={styles.statMiniNum}>{stats.byType?.upi || 0}</Text>
            <Text style={styles.statMiniLabel}>💳 UPI ID</Text>
          </View>
          <View style={styles.statMini}>
            <Text style={styles.statMiniNum}>{stats.byType?.website || 0}</Text>
            <Text style={styles.statMiniLabel}>🌐 Web Links</Text>
          </View>
        </View>
      </View>

      {/* 1. Verification Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🔍 SafeCall Verify</Text>
        <Text style={styles.sectionDesc}>Check if a contact detail is registered in the blacklist database.</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter Number, UPI ID, or Web Domain..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleVerify}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleVerify}>
            <Text style={styles.searchBtnText}>Verify</Text>
          </TouchableOpacity>
        </View>

        {isSearching && <Text style={styles.statusText}>Searching blacklist databases...</Text>}

        {searchResult && (
          <View style={[
            styles.resultBox,
            searchResult.isScam ? styles.resultScam : styles.resultSafe
          ]}>
            <Text style={[
              styles.resultTitle,
              searchResult.isScam ? styles.resultTextScam : styles.resultTextSafe
            ]}>
              {searchResult.isScam ? '⚠️ CONFIRMED FRAUD MATCH' : '✅ NO BLACKLIST MATCH'}
            </Text>
            <Text style={styles.resultText}>
              {searchResult.isScam 
                ? `This item has been flagged! Detected Category: ${searchResult.info?.category}. Reported matches: ${searchResult.info?.totalReports || 1} times.` 
                : 'No reports found for this contact. However, scammers frequently rotate credentials; please stay alert.'}
            </Text>
          </View>
        )}
      </View>

      {/* 2. Reporting Form */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>✍️ Anonymous Scam Report</Text>
        <Text style={styles.sectionDesc}>Submit a scam credential (phone number, UPI ID, web link) to warn others.</Text>

        <TextInput
          style={styles.formInput}
          placeholder="Credential Value (e.g. +91 99999 88888, fakecbi@ybl)"
          placeholderTextColor="#64748b"
          value={scamValue}
          onChangeText={setScamValue}
        />

        {/* Type selector row */}
        <Text style={styles.formLabel}>Type:</Text>
        <View style={styles.typeSelector}>
          {['phone', 'upi', 'website', 'other'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, type === t && styles.activeTypeBtn]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeBtnText, type === t && styles.activeTypeBtnText]}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category selector row */}
        <Text style={styles.formLabel}>Category:</Text>
        <View style={styles.typeSelector}>
          {['Digital Arrest', 'Bank Fraud', 'Lottery', 'Refund/Tax'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryBtn, scamCategory === cat && styles.activeCategoryBtn]}
              onPress={() => setScamCategory(cat)}
            >
              <Text style={[styles.typeBtnText, scamCategory === cat && styles.activeTypeBtnText]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.formInput, styles.textArea]}
          placeholder="Scam Details / What threats did they use? (Optional)"
          placeholderTextColor="#64748b"
          multiline
          numberOfLines={3}
          value={description}
          onChangeText={setDescription}
        />

        {submitStatus && (
          <Text style={[
            styles.submitStatusText,
            submitStatus.success ? styles.submitSuccess : styles.submitError
          ]}>
            {submitStatus.message}
          </Text>
        )}

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>Submit Blacklist Report</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Community Feed */}
      <Text style={styles.feedTitle}>Recent Blacklist Submissions</Text>
      <FlatList
        data={communityReports.slice(0, 10)}
        keyExtractor={(item) => item._id}
        renderItem={renderScamItem}
        scrollEnabled={false} // since parent is ScrollView
        contentContainerStyle={styles.feedList}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statMini: {
    alignItems: 'center',
    flex: 1,
  },
  statMiniNum: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statMiniLabel: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  sectionDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#ffffff',
  },
  searchBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  statusText: {
    color: '#3b82f6',
    fontSize: 10,
    marginTop: 8,
  },
  resultBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  resultScam: {
    backgroundColor: '#ef444410',
    borderColor: '#dc2626',
  },
  resultSafe: {
    backgroundColor: '#10b98110',
    borderColor: '#16a34a',
  },
  resultTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultTextScam: {
    color: '#ef4444',
  },
  resultTextSafe: {
    color: '#10b981',
  },
  resultText: {
    fontSize: 11,
    color: '#e2e8f0',
    lineHeight: 16,
  },
  formInput: {
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#ffffff',
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  typeBtn: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  activeTypeBtn: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb1a',
  },
  categoryBtn: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  activeCategoryBtn: {
    borderColor: '#10b981',
    backgroundColor: '#10b9811a',
  },
  typeBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
  },
  activeTypeBtnText: {
    color: '#60a5fa',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  submitStatusText: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 10,
    textAlign: 'center',
  },
  submitSuccess: {
    color: '#10b981',
  },
  submitError: {
    color: '#ef4444',
  },
  feedTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  feedList: {
    gap: 10,
  },
  scamCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
  },
  scamCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scamIconText: {
    fontSize: 18,
  },
  scamInfo: {
    flex: 1,
  },
  scamValText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scamCatText: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
  },
  scamDescText: {
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 15,
    marginTop: 8,
  },
  scamDateText: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 6,
  },
});

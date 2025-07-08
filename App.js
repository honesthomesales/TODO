import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, Platform, Modal, Animated, Alert } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { Calendar } from 'react-native-big-calendar';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from './supabaseClient';
import * as Speech from 'expo-speech';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const Tab = createMaterialTopTabNavigator();

const PRIORITY_OPTIONS = [
  { label: 'High', color: '#ff4d4f', flag: '🚩' },
  { label: 'Medium', color: '#faad14', flag: '🏳️' },
  { label: 'Low', color: '#8c8c8c', flag: '🏁' },
];

// Team member colors for assignment
const TEAM_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', 
  '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
];

const CALENDAR_MODES = [
  { label: 'Week', value: 'week' },
  { label: '3 Days', value: '3days' },
  { label: 'Day', value: 'day' },
];

// 1. Add STATUS_OPTIONS
const STATUS_OPTIONS = [
  { label: 'To Do', value: 'todo' },
  { label: 'In Progress', value: 'inprogress' },
  { label: 'Complete', value: 'complete' },
];

// Utility functions
function formatShortDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupTodosByDate(todos) {
  const groups = {};
  todos.forEach(todo => {
    const dateKey = formatShortDate(todo.dueDate);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(todo);
  });
  return groups;
}

function getPriorityGroup(label) {
  if (label === 'High') return 'High Priority';
  if (label === 'Medium') return 'Medium Priority';
  return 'Low Priority';
}

function getStatusAndColor(todo) {
  if (todo.completed) return { text: 'Complete', color: '#1abc9c' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(todo.dueDate);
  due.setHours(0, 0, 0, 0);
  if (due.getTime() === today.getTime()) return { text: 'To Do', color: '#ff4d4f' };
  if (due > today) return { text: 'To Do', color: '#faad14' };
  return { text: 'To Do', color: '#ff4d4f' };
}

// Data conversion functions
const normalizeTodo = (todo) => {
  let dueDate;
  if (todo.due_date instanceof Date) {
    dueDate = todo.due_date;
  } else if (typeof todo.due_date === 'string' && !isNaN(Date.parse(todo.due_date))) {
    dueDate = new Date(todo.due_date);
  } else {
    dueDate = new Date();
  }
  return {
    key: todo.id,
    text: todo.text,
    completed: todo.completed,
    dueDate,
    priority: {
      label: todo.priority || 'Medium',
      color: PRIORITY_OPTIONS.find(opt => opt.label === todo.priority)?.color || '#faad14',
      flag: PRIORITY_OPTIONS.find(opt => opt.label === todo.priority)?.flag || '🏳️'
    },
    assignee: todo.assignee || null,
    manualOrder: todo.manual_order || 0,
    status: todo.status || 'todo',
  };
};

const todoToSupabaseFormat = (todo) => {
  return {
    id: todo.key,
    text: todo.text,
    completed: todo.completed,
    due_date: todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : null,
    priority: typeof todo.priority === 'string' ? todo.priority : (todo.priority && todo.priority.label ? todo.priority.label : 'Medium'),
    assignee: todo.assignee,
    manual_order: todo.manualOrder || 0,
    status: todo.status || 'todo',
  };
};

// Utility function to check for valid Date
function isValidDate(d) {
  return d instanceof Date && !isNaN(d.getTime());
}

// Calendar Screen
function CalendarScreen({ todos, teamMembers }) {
  const [mode, setMode] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const staticEvents = [
    {
      title: 'Team sync',
      start: new Date(2024, 1, 17, 10, 0),
      end: new Date(2024, 1, 17, 11, 0),
    },
  ];
  
  const todoEvents = todos.map(todo => {
    const date = new Date(todo.dueDate);
    const assignee = todo.assignee ? teamMembers.find(m => m.id === todo.assignee) : null;
    const assigneeIndex = assignee ? teamMembers.findIndex(m => m.id === todo.assignee) : -1;
    const eventColor = assigneeIndex >= 0 ? TEAM_COLORS[assigneeIndex % TEAM_COLORS.length] : '#ccc';
    const assigneeInitials = assignee ? assignee.name.split(' ').map(n => n[0]).join('').toUpperCase() : '';
    
    return {
      title: `${todo.text} ${todo.priority.flag}${assigneeInitials ? ` 👤${assigneeInitials}` : ''}`,
      start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0),
      end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0),
      color: eventColor,
    };
  });
  
  const events = [...staticEvents, ...todoEvents];
  const now = new Date();
  const scrollOffsetMinutes = now.getHours() * 60 + now.getMinutes();
  const calendarTheme = {
    palette: {
      nowIndicator: '#007bff',
    },
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Calendar</Text>
      <View style={styles.calendarModeRow}>
        {CALENDAR_MODES.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.modeButton, mode === opt.value && styles.modeButtonActive]}
            onPress={() => setMode(opt.value)}
          >
            <Text style={mode === opt.value ? styles.modeButtonTextActive : styles.modeButtonText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Calendar
        events={events}
        height={600}
        mode={mode}
        weekStartsOn={1}
        date={currentDate}
        showTime
        hideNowIndicator={false}
        theme={calendarTheme}
        scrollOffsetMinutes={scrollOffsetMinutes}
        eventCellStyle={event => event.color ? { backgroundColor: event.color } : {}}
      />
      <StatusBar style="auto" />
    </View>
  );
}

// Draggable Todo Item Component
function DraggableTodoItem({ item, onToggle, onRemove, onMove, onEdit, teamMembers, onStatusChange }) {
  const translateY = new Animated.Value(0);
  const scale = new Animated.Value(1);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = event => {
    if (event.nativeEvent.state === State.BEGAN) {
      Animated.spring(scale, {
        toValue: 1.05,
        useNativeDriver: true,
      }).start();
    } else if (event.nativeEvent.oldState === State.ACTIVE) {
      let { translationY } = event.nativeEvent;
      
      if (translationY < -20) {
        onMove(item, 'up');
      } else if (translationY > 20) {
        onMove(item, 'down');
      }
      
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        })
      ]).start();
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View
        style={[
          styles.todoRow,
          item.completed && styles.todoRowCompleted,
          {
            transform: [
              { translateY },
              { scale }
            ],
            zIndex: 1,
          }
        ]}
      >
        <View style={[styles.flagCircle, { backgroundColor: item.priority.color }]} />
        <View style={styles.todoContent}>
          <View style={styles.todoTextContainer}>
            <Text style={[styles.todoText, item.completed && styles.todoTextCompleted]}>{item.text}</Text>
          </View>

          <Text style={styles.todoDate}>{formatShortDate(item.dueDate)}</Text>
        </View>
        
        {/* Status Dropdown/Buttons */}
        <View style={styles.statusContainer}>
          {STATUS_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.statusButton, item.status === opt.value && styles.statusButtonActive]}
              onPress={() => onStatusChange(item, opt.value)}
            >
              <Text style={item.status === opt.value ? styles.statusButtonTextActive : styles.statusButtonText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.todoActions}>
          <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionButton}>
            <Text style={styles.editButton}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onRemove(item.key)} style={styles.actionButton}>
            <Text style={styles.removeButton}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
}

// Todo List Screen
function TodoListScreen({ todos, setTodos, onAddTodo, onRemoveTodo, onToggleComplete, onMoveTodo, onUpdateTodo, teamMembers }) {
  const [input, setInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [priority, setPriority] = useState(PRIORITY_OPTIONS[0]);
  const [dueDate, setDueDate] = useState(new Date());
  const [assignee, setAssignee] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [isWebSpeechSupported, setIsWebSpeechSupported] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Check for Web Speech API support
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      typeof window.webkitSpeechRecognition !== 'undefined' &&
      !Platform.OS
    ) {
      setIsWebSpeechSupported(true);
      const recognitionInstance = new window.webkitSpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      setRecognition(recognitionInstance);
    }
  }, []);

  const startListening = () => {
    if (Platform.OS) {
      Alert.alert(
        'Microphone Permission Required',
        'To use voice input on your mobile device:\n\n1. Allow microphone permission when prompted\n2. Use your device\'s built-in voice input\n3. Make sure voice input is enabled in your device settings\n\nWould you like to continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsListening(false)
          },
          {
            text: 'Continue',
            onPress: () => {
              setShowVoiceModal(true);
              setIsListening(true);
            }
          }
        ]
      );
    } else {
      setShowVoiceModal(true);
      setIsListening(true);
      
      if (isWebSpeechSupported && recognition) {
        recognition.onstart = () => {
          console.log('Speech recognition started');
        };

        recognition.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          setVoiceInput(finalTranscript || interimTranscript);

          if (finalTranscript) {
            recognition.stop();
          }
        };

        recognition.onerror = (event) => {
          console.log('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            Alert.alert('Permission Denied', 'Please allow microphone access to use voice input.');
          } else {
            Alert.alert('Error', 'Voice recognition failed. You can still type manually.');
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        try {
          recognition.start();
        } catch (error) {
          console.log('Error starting speech recognition:', error);
          setIsListening(true);
        }
      }
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
    setIsListening(false);
    setShowVoiceModal(false);
  };

  const confirmVoiceInput = () => {
    if (voiceInput.trim()) {
      setInput(voiceInput.trim());
      setVoiceInput('');
      setShowVoiceModal(false);
      setIsListening(false);
      setShowModal(true);
    }
  };

  const confirmAddTodo = async () => {
    if (input.trim()) {
      await onAddTodo(input.trim(), dueDate, priority, assignee);
      setInput('');
      setPriority(PRIORITY_OPTIONS[0]);
      setDueDate(new Date());
      setAssignee(null);
      setShowModal(false);
    }
  };

  const moveTodo = (item, direction) => {
    const sortedTodos = [...todos].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
      const priorityDiff = PRIORITY_OPTIONS.findIndex(opt => opt.label === a.priority.label) - PRIORITY_OPTIONS.findIndex(opt => opt.label === b.priority.label);
      if (priorityDiff !== 0) return priorityDiff;
      return (a.manualOrder || 0) - (b.manualOrder || 0);
    });
    
    const currentIndex = sortedTodos.findIndex(todo => todo.key === item.key);
    
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'up' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < sortedTodos.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return;
    }

    const currentItem = sortedTodos[currentIndex];
    const targetItem = sortedTodos[newIndex];
    
    const currentDate = new Date(currentItem.dueDate);
    const targetDate = new Date(targetItem.dueDate);
    const isMovingToDifferentDate = currentDate.getTime() !== targetDate.getTime();
    
    const newTodos = todos.map(todo => {
      if (todo.key === currentItem.key) {
        const updatedTodo = { 
          ...todo, 
          manualOrder: targetItem.manualOrder || newIndex 
        };
        
        if (isMovingToDifferentDate) {
          updatedTodo.dueDate = targetDate;
        }
        
        return updatedTodo;
      } else if (todo.key === targetItem.key) {
        return { ...todo, manualOrder: currentItem.manualOrder || currentIndex };
      }
      return todo;
    });
    
    setTodos(newTodos);
  };

  // Sort todos
  const sortedTodos = [...todos]
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const priorityDiff = PRIORITY_OPTIONS.findIndex(opt => opt.label === a.priority.label) - PRIORITY_OPTIONS.findIndex(opt => opt.label === b.priority.label);
      if (priorityDiff !== 0) return priorityDiff;
      return (a.manualOrder || 0) - (b.manualOrder || 0);
    });
  
  // Group by assignee instead of date
  const groupTodosByAssignee = (todos) => {
    const groups = {};
    todos.forEach(todo => {
      const assigneeId = todo.assignee || 'unassigned';
      const assigneeName = todo.assignee 
        ? teamMembers.find(m => m.id === todo.assignee)?.name || 'Unknown'
        : 'Unassigned';
      
      if (!groups[assigneeId]) {
        groups[assigneeId] = {
          name: assigneeName,
          todos: []
        };
      }
      groups[assigneeId].todos.push(todo);
    });
    return groups;
  };
  
  const grouped = groupTodosByAssignee(sortedTodos.filter(t => !t.completed));
  const completed = sortedTodos.filter(t => t.completed);
  const allGroups = Object.entries(grouped);

  // Flatten for FlatList
  const flatData = [];
  allGroups.forEach(([assigneeId, group]) => {
    flatData.push({ type: 'header', assigneeId, assigneeName: group.name, key: `header-${assigneeId}` });
    group.todos.forEach(task => flatData.push({ ...task, type: 'task' }));
  });
  if (completed.length) {
    flatData.push({ type: 'header', assigneeId: 'completed', assigneeName: 'Completed', key: 'header-Completed' });
    completed.forEach(task => flatData.push({ ...task, type: 'task' }));
  }

  const handleAddPress = () => {
    setShowModal(true);
  };

  const handleInputSubmit = () => {
    setShowModal(true);
  };

  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
    setInput(todo.text);
    setPriority(todo.priority);
    setDueDate(todo.dueDate);
    setAssignee(todo.assignee);
    setShowEditModal(true);
  };

  const confirmEditTodo = async () => {
    if (input.trim() && editingTodo) {
      await onUpdateTodo(editingTodo.key, {
        text: input.trim(),
        dueDate: dueDate,
        priority: priority,
        assignee: assignee
      });
      setInput('');
      setPriority(PRIORITY_OPTIONS[0]);
      setDueDate(new Date());
      setAssignee(null);
      setEditingTodo(null);
      setShowEditModal(false);
    }
  };

  const handleStatusChange = async (todo, newStatus) => {
    await onUpdateTodo(todo.key, { status: newStatus });
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a new todo"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleInputSubmit}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      
      {isListening && (
        <View style={styles.listeningIndicator}>
          <Text style={styles.listeningText}>Listening... Speak now!</Text>
        </View>
      )}
      
      {/* Priority & Date Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Priority & Due Date</Text>
            <View style={styles.row}>
              {PRIORITY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.priorityButton, { backgroundColor: priority.label === opt.label ? opt.color : '#eee' }]}
                  onPress={() => setPriority(opt)}
                >
                  <Text style={{ color: priority.label === opt.label ? '#fff' : '#333' }}>{opt.flag} {opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: '#333' }}>Due: {formatShortDate(dueDate)}</Text>
            </TouchableOpacity>
            
            {/* Assignee Selection */}
            <View style={styles.assigneeSection}>
              <Text style={styles.assigneeLabel}>Assign to:</Text>
              
              <View style={styles.assigneeOptions}>
                <TouchableOpacity
                  style={[
                    styles.assigneeOption,
                    !assignee && styles.assigneeOptionSelected
                  ]}
                  onPress={() => setAssignee(null)}
                >
                  <Text style={!assignee ? styles.assigneeOptionTextSelected : styles.assigneeOptionText}>
                    Unassigned
                  </Text>
                </TouchableOpacity>
                {teamMembers.map((member, index) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.assigneeOption,
                      assignee === member.id && styles.assigneeOptionSelected
                    ]}
                    onPress={() => setAssignee(member.id)}
                  >
                    <View style={[styles.assigneeAvatar, { backgroundColor: TEAM_COLORS[index % TEAM_COLORS.length] }]}>
                      <Text style={styles.assigneeInitials}>
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={assignee === member.id ? styles.assigneeOptionTextSelected : styles.assigneeOptionText}>
                      {member.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {showDatePicker && (
              Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={dueDate ? dueDate.toISOString().substr(0, 10) : ''}
                  onChange={e => {
                    setShowDatePicker(false);
                    if (e.target.value) setDueDate(new Date(e.target.value));
                  }}
                  style={{ fontSize: 18, padding: 8, margin: 8 }}
                  autoFocus
                />
              ) : (
                <DateTimePicker
                  value={isValidDate(dueDate) ? dueDate : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    setShowDatePicker(false);
                    if (date) setDueDate(date);
                  }}
                />
              )
            )}
            <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={[styles.addButton, { backgroundColor: '#aaa', marginRight: 10 }]}> 
                <Text style={styles.addButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmAddTodo} style={styles.addButton}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Edit Todo Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Task</Text>
            <TextInput
              style={styles.editInput}
              placeholder="Task description"
              value={input}
              onChangeText={setInput}
            />
            <View style={styles.row}>
              {PRIORITY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.priorityButton, { backgroundColor: priority.label === opt.label ? opt.color : '#eee' }]}
                  onPress={() => setPriority(opt)}
                >
                  <Text style={{ color: priority.label === opt.label ? '#fff' : '#333' }}>{opt.flag} {opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: '#333' }}>Due: {formatShortDate(dueDate)}</Text>
            </TouchableOpacity>
            
            {/* Assignee Selection */}
            <View style={styles.assigneeSection}>
              <Text style={styles.assigneeLabel}>Assign to:</Text>
              
              <View style={styles.assigneeOptions}>
                <TouchableOpacity
                  style={[
                    styles.assigneeOption,
                    !assignee && styles.assigneeOptionSelected
                  ]}
                  onPress={() => setAssignee(null)}
                >
                  <Text style={!assignee ? styles.assigneeOptionTextSelected : styles.assigneeOptionText}>
                    Unassigned
                  </Text>
                </TouchableOpacity>
                {teamMembers.map((member, index) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.assigneeOption,
                      assignee === member.id && styles.assigneeOptionSelected
                    ]}
                    onPress={() => setAssignee(member.id)}
                  >
                    <View style={[styles.assigneeAvatar, { backgroundColor: TEAM_COLORS[index % TEAM_COLORS.length] }]}>
                      <Text style={styles.assigneeInitials}>
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={assignee === member.id ? styles.assigneeOptionTextSelected : styles.assigneeOptionText}>
                      {member.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {showDatePicker && (
              Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={dueDate ? dueDate.toISOString().substr(0, 10) : ''}
                  onChange={e => {
                    setShowDatePicker(false);
                    if (e.target.value) setDueDate(new Date(e.target.value));
                  }}
                  style={{ fontSize: 18, padding: 8, margin: 8 }}
                  autoFocus
                />
              ) : (
                <DateTimePicker
                  value={isValidDate(dueDate) ? dueDate : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    setShowDatePicker(false);
                    if (date) setDueDate(date);
                  }}
                />
              )
            )}
            <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={[styles.addButton, { backgroundColor: '#aaa', marginRight: 10 }]}> 
                <Text style={styles.addButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmEditTodo} style={styles.addButton}>
                <Text style={styles.addButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Voice Input Modal */}
      <Modal
        visible={showVoiceModal}
        transparent
        animationType="slide"
        onRequestClose={stopListening}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.voiceModalContent}>
            <Text style={styles.voiceModalTitle}>
              {isListening ? '🎤 Voice Input' : 'Voice Input'}
            </Text>
            <Text style={styles.voiceModalSubtitle}>
              {Platform.OS 
                ? 'Use your device\'s built-in voice input:'
                : (isWebSpeechSupported 
                  ? (isListening ? 'Speak your todo item now...' : 'Click the microphone and speak, or type manually:')
                  : 'Use your device\'s voice input or type manually:'
                )
              }
            </Text>
            
            <View style={styles.voiceInputContainer}>
              <TextInput
                style={styles.voiceInput}
                placeholder={Platform.OS ? "Tap the microphone icon on your keyboard to use voice input..." : "Type or speak your todo..."}
                value={voiceInput}
                onChangeText={setVoiceInput}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={stopListening} style={[styles.addButton, { backgroundColor: '#aaa', marginRight: 10 }]}> 
                <Text style={styles.addButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmVoiceInput} style={styles.addButton}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <FlatList
        data={flatData}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.header}>
                <Text style={styles.headerText}>{item.assigneeName}</Text>
              </View>
            );
          }
          return (
            <DraggableTodoItem
              item={item}
              onToggle={onToggleComplete}
              onRemove={onRemoveTodo}
              onMove={moveTodo}
              onEdit={handleEditTodo}
              teamMembers={teamMembers}
              onStatusChange={handleStatusChange}
            />
          );
        }}
      />
    </View>
  );
}

// Team Members Screen
function TeamMembersScreen({ teamMembers, onAddTeamMember, onRemoveTeamMember }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const handleAddMember = async () => {
    if (newMemberName.trim() && newMemberEmail.trim()) {
      await onAddTeamMember(newMemberName.trim(), newMemberEmail.trim());
      setNewMemberName('');
      setNewMemberEmail('');
      setShowAddModal(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Team Members</Text>
      
      <TouchableOpacity 
        style={styles.addTeamMemberButton} 
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.addTeamMemberButtonText}>+ Add Team Member</Text>
      </TouchableOpacity>

      <FlatList
        data={teamMembers}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.teamMemberRow}>
            <View style={[styles.memberAvatar, { backgroundColor: TEAM_COLORS[index % TEAM_COLORS.length] }]}>
              <Text style={styles.memberInitials}>
                {item.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{item.name}</Text>
              <Text style={styles.memberEmail}>{item.email}</Text>
            </View>
            <TouchableOpacity 
              style={styles.removeMemberButton}
              onPress={() => onRemoveTeamMember(item.id)}
            >
              <Text style={styles.removeX}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No team members yet!</Text>}
      />

      {/* Add Team Member Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Team Member</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Full Name"
              value={newMemberName}
              onChangeText={setNewMemberName}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              value={newMemberEmail}
              onChangeText={setNewMemberEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'flex-end' }}>
              <TouchableOpacity 
                onPress={() => setShowAddModal(false)} 
                style={[styles.addButton, { backgroundColor: '#aaa', marginRight: 10 }]}
              > 
                <Text style={styles.addButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddMember} style={styles.addButton}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Prioritized Screen
function PrioritizedScreen({ todos, setTodos, onToggleComplete, onRemoveTodo, onUpdateTodo, teamMembers }) {
  const [editingTodo, setEditingTodo] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState(PRIORITY_OPTIONS[0]);
  const [dueDate, setDueDate] = useState(new Date());
  const [assignee, setAssignee] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
    setInput(todo.text);
    setPriority(todo.priority);
    setDueDate(todo.dueDate);
    setAssignee(todo.assignee);
    setShowEditModal(true);
  };

  const confirmEditTodo = async () => {
    if (input.trim() && editingTodo) {
      await onUpdateTodo(editingTodo.key, {
        text: input.trim(),
        dueDate: dueDate,
        priority: priority,
        assignee: assignee
      });
      setInput('');
      setPriority(PRIORITY_OPTIONS[0]);
      setDueDate(new Date());
      setAssignee(null);
      setEditingTodo(null);
      setShowEditModal(false);
    }
  };

  const moveTodo = (item, direction) => {
    const sortedTodos = [...todos].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
      const priorityDiff = PRIORITY_OPTIONS.findIndex(opt => opt.label === a.priority.label) - PRIORITY_OPTIONS.findIndex(opt => opt.label === b.priority.label);
      if (priorityDiff !== 0) return priorityDiff;
      return (a.manualOrder || 0) - (b.manualOrder || 0);
    });
    
    const currentIndex = sortedTodos.findIndex(todo => todo.key === item.key);
    
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'up' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < sortedTodos.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return;
    }

    const currentItem = sortedTodos[currentIndex];
    const targetItem = sortedTodos[newIndex];
    
    const currentDate = new Date(currentItem.dueDate);
    const targetDate = new Date(targetItem.dueDate);
    const isMovingToDifferentDate = currentDate.getTime() !== targetDate.getTime();
    
    const newTodos = todos.map(todo => {
      if (todo.key === currentItem.key) {
        const updatedTodo = { 
          ...todo, 
          manualOrder: targetItem.manualOrder || newIndex 
        };
        
        if (isMovingToDifferentDate) {
          updatedTodo.dueDate = targetDate;
        }
        
        return updatedTodo;
      } else if (todo.key === targetItem.key) {
        return { ...todo, manualOrder: currentItem.manualOrder || currentIndex };
      }
      return todo;
    });
    
    setTodos(newTodos);
  };

  const sorted = [...todos].sort((a, b) => {
    const prioA = PRIORITY_OPTIONS.findIndex(opt => opt.label === a.priority.label);
    const prioB = PRIORITY_OPTIONS.findIndex(opt => opt.label === b.priority.label);
    if (prioA !== prioB) return prioA - prioB;
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const dateA = new Date(a.dueDate);
    const dateB = new Date(b.dueDate);
    if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
    return 0;
  });
  
  const groups = {};
  sorted.forEach(todo => {
    const group = getPriorityGroup(todo.priority.label);
    if (!groups[group]) groups[group] = [];
    groups[group].push(todo);
  });
  
  const groupEntries = Object.entries(groups);
  const flatData = [];
  groupEntries.forEach(([group, tasks]) => {
    flatData.push({ type: 'header', group, key: `header-${group}` });
    tasks.forEach(task => flatData.push({ ...task, type: 'task' }));
  });

  const handleStatusChange = async (todo, newStatus) => {
    await onUpdateTodo(todo.key, { status: newStatus });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Performance Tracking</Text>
      
      {/* Edit Todo Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Task</Text>
            <TextInput
              style={styles.editInput}
              placeholder="Task description"
              value={input}
              onChangeText={setInput}
            />
            <View style={styles.row}>
              {PRIORITY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.priorityButton, { backgroundColor: priority.label === opt.label ? opt.color : '#eee' }]}
                  onPress={() => setPriority(opt)}
                >
                  <Text style={{ color: priority.label === opt.label ? '#fff' : '#333' }}>{opt.flag} {opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: '#333' }}>Due: {formatShortDate(dueDate)}</Text>
            </TouchableOpacity>
            
            {/* Assignee Selection */}
            <View style={styles.assigneeSection}>
              <Text style={styles.assigneeLabel}>Assign to:</Text>
              
              <View style={styles.assigneeOptions}>
                <TouchableOpacity
                  style={[
                    styles.assigneeOption,
                    !assignee && styles.assigneeOptionSelected
                  ]}
                  onPress={() => setAssignee(null)}
                >
                  <Text style={!assignee ? styles.assigneeOptionTextSelected : styles.assigneeOptionText}>
                    Unassigned
                  </Text>
                </TouchableOpacity>
                {teamMembers.map((member, index) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.assigneeOption,
                      assignee === member.id && styles.assigneeOptionSelected
                    ]}
                    onPress={() => setAssignee(member.id)}
                  >
                    <View style={[styles.assigneeAvatar, { backgroundColor: TEAM_COLORS[index % TEAM_COLORS.length] }]}>
                      <Text style={styles.assigneeInitials}>
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={assignee === member.id ? styles.assigneeOptionTextSelected : styles.assigneeOptionText}>
                      {member.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {showDatePicker && (
              Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={dueDate ? dueDate.toISOString().substr(0, 10) : ''}
                  onChange={e => {
                    setShowDatePicker(false);
                    if (e.target.value) setDueDate(new Date(e.target.value));
                  }}
                  style={{ fontSize: 18, padding: 8, margin: 8 }}
                  autoFocus
                />
              ) : (
                <DateTimePicker
                  value={isValidDate(dueDate) ? dueDate : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    setShowDatePicker(false);
                    if (date) setDueDate(date);
                  }}
                />
              )
            )}
            <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={[styles.addButton, { backgroundColor: '#aaa', marginRight: 10 }]}> 
                <Text style={styles.addButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmEditTodo} style={styles.addButton}>
                <Text style={styles.addButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        data={flatData}
        keyExtractor={item => item.key}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.prioGroupBlock}>
                <Text style={styles.prioGroupTitle}>{item.group}</Text>
                <View style={styles.prioHeaderRow}>
                  <Text style={[styles.prioHeader, { flex: 0.1 }]}></Text>
                  <Text style={[styles.prioHeader, { flex: 1.5 }]}>Task</Text>
                  <Text style={[styles.prioHeader, { flex: 0.8 }]}>Date</Text>
                  <Text style={[styles.prioHeader, { flex: 0.8 }]}>Status</Text>
                  <Text style={[styles.prioHeader, { flex: 0.3 }]}>Actions</Text>
                </View>
              </View>
            );
          }
          const status = getStatusAndColor(item);
          return (
            <DraggableTodoItem
              item={item}
              onToggle={onToggleComplete}
              onRemove={onRemoveTodo}
              onMove={moveTodo}
              onEdit={handleEditTodo}
              teamMembers={teamMembers}
              onStatusChange={handleStatusChange}
            />
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>No prioritized tasks yet!</Text>}
      />
    </View>
  );
}

// Main App Component
export default function App() {
  const [todos, setTodos] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Load todos and team members from Supabase on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Load todos
        const { data: todosData, error: todosError } = await supabase
          .from('todos')
          .select('*')
          .order('manual_order', { ascending: true });
        
        if (todosError) {
          console.error('Error loading todos from Supabase:', todosError);
          setTodos([]);
        } else {
          setTodos((todosData || []).map(normalizeTodo));
        }

        // Load team members
        const { data: membersData, error: membersError } = await supabase
          .from('team_members')
          .select('*')
          .order('name', { ascending: true });
        
        if (membersError) {
          console.error('Error loading team members from Supabase:', membersError);
          setTeamMembers([]);
        } else {
          setTeamMembers(membersData || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setTodos([]);
        setTeamMembers([]);
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    })();
  }, []);

  // Todo operations
  const addTodo = async (text, dueDate, priority, assignee) => {
    const newTodo = {
      id: uuidv4(),
      text: text.trim(),
      completed: false,
      due_date: dueDate ? new Date(dueDate).toISOString().split('T')[0] : null,
      priority: typeof priority === 'string' ? priority : (priority && priority.label ? priority.label : 'Medium'),
      assignee: assignee,
      manual_order: todos.length,
      status: 'todo', // Default status
    };
    
    const { error: insertError } = await supabase.from('todos').insert([newTodo]);
    if (insertError) {
      console.error('Error inserting todo:', insertError);
      return;
    }
    
    // Fetch updated todos from Supabase
    const { data, error: fetchError } = await supabase
      .from('todos')
      .select('*')
      .order('manual_order', { ascending: true });
    
    if (fetchError) {
      console.error('Error fetching todos:', fetchError);
      return;
    }
    
    setTodos((data || []).map(normalizeTodo));
  };

  const removeTodo = async (key) => {
    const { error: deleteError } = await supabase
      .from('todos')
      .delete()
      .eq('id', key);
    
    if (deleteError) {
      console.error('Error deleting todo from Supabase:', deleteError);
      return;
    }
    
    setTodos(todos.filter(todo => todo.key !== key));
  };

  const toggleComplete = async (key) => {
    const todo = todos.find(t => t.key === key);
    if (!todo) return;
    
    const updatedTodo = { ...todo, completed: !todo.completed };
    const supabaseTodo = todoToSupabaseFormat(updatedTodo);
    
    const { error: updateError } = await supabase
      .from('todos')
      .update({ completed: supabaseTodo.completed })
      .eq('id', key);
    
    if (updateError) {
      console.error('Error updating todo:', updateError);
      return;
    }
    
    setTodos(todos.map(todo => todo.key === key ? updatedTodo : todo));
  };

  const updateTodo = async (key, updatedData) => {
    const todo = todos.find(t => t.key === key);
    if (!todo) return;
    
    const updatedTodo = { ...todo, ...updatedData };
    const supabaseTodo = todoToSupabaseFormat(updatedTodo);
    
    const { error: updateError } = await supabase
      .from('todos')
      .update({
        text: supabaseTodo.text,
        due_date: supabaseTodo.due_date,
        priority: supabaseTodo.priority,
        assignee: supabaseTodo.assignee,
        status: supabaseTodo.status, // Add status to update
      })
      .eq('id', key);
    
    if (updateError) {
      console.error('Error updating todo:', updateError);
      return;
    }
    
    setTodos(todos.map(todo => todo.key === key ? updatedTodo : todo));
  };

  // Team member operations
  const addTeamMember = async (name, email) => {
    const newMember = {
      id: uuidv4(),
      name: name,
      email: email,
    };
    
    const { error: insertError } = await supabase.from('team_members').insert([newMember]);
    if (insertError) {
      console.error('Error inserting team member:', insertError);
      return;
    }
    
    setTeamMembers([...teamMembers, newMember]);
  };

  const removeTeamMember = async (id) => {
    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('Error deleting team member:', deleteError);
      return;
    }
    
    setTeamMembers(teamMembers.filter(member => member.id !== id));
  };

  // Save todos to Supabase when they change (except on initial load)
  useEffect(() => {
    if (!loading && initialLoadComplete && todos.length > 0) {
      (async () => {
        for (const todo of todos) {
          const supabaseTodo = todoToSupabaseFormat(todo);
          const { error: upsertError } = await supabase.from('todos').upsert(supabaseTodo);
          if (upsertError) {
            console.error('Error saving todo to Supabase:', upsertError);
          }
        }
      })();
    }
  }, [todos, loading, initialLoadComplete]);

  // User Selection Screen
  if (!currentUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Who are you?</Text>
        <Text style={styles.subtitle}>Select your name to continue</Text>
        
        <View style={styles.userSelectionContainer}>
          {teamMembers.map((member, index) => (
            <TouchableOpacity
              key={member.id}
              style={styles.userOption}
              onPress={() => setCurrentUser(member)}
            >
              <View style={[styles.userAvatar, { backgroundColor: TEAM_COLORS[index % TEAM_COLORS.length] }]}>
                <Text style={styles.userInitials}>
                  {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.userName}>{member.name}</Text>
            </TouchableOpacity>
          ))}
          
          {teamMembers.length === 0 && (
            <Text style={styles.noUsersText}>
              No team members found. Please add team members first.
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, paddingTop: 20 }}>
      {/* User indicator */}
      <View style={styles.userIndicator}>
        <View style={[styles.currentUserAvatar, { 
          backgroundColor: TEAM_COLORS[teamMembers.findIndex(m => m.id === currentUser.id) % TEAM_COLORS.length] 
        }]}>
          <Text style={styles.currentUserInitials}>
            {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.currentUserName}>{currentUser.name}</Text>
        <TouchableOpacity 
          style={styles.switchUserButton}
          onPress={() => setCurrentUser(null)}
        >
          <Text style={styles.switchUserButtonText}>Switch</Text>
        </TouchableOpacity>
      </View>
      
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarPosition: 'top',
            tabBarActiveTintColor: '#007bff',
            tabBarInactiveTintColor: '#666',
            tabBarStyle: {
              backgroundColor: '#fff',
              borderBottomWidth: 1,
              borderBottomColor: '#eee',
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              paddingTop: 5, // Minimal padding to bring tabs closer to user indicator
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            },
            headerShown: false,
          }}
        >
          <Tab.Screen 
            name="Calendar" 
            options={{ tabBarLabel: '📅 Calendar' }}
          >
            {() => <CalendarScreen todos={todos} teamMembers={teamMembers} />}
          </Tab.Screen>
          <Tab.Screen 
            name="Team View" 
            options={{ tabBarLabel: '👥 Team' }}
          >
            {() => (
              <TodoListScreen 
                todos={todos} 
                setTodos={setTodos}
                onAddTodo={addTodo}
                onRemoveTodo={removeTodo}
                onToggleComplete={toggleComplete}
                onUpdateTodo={updateTodo}
                onMoveTodo={(item, direction) => {
                  console.log('Move todo:', item.text, direction);
                }}
                teamMembers={teamMembers}
              />
            )}
          </Tab.Screen>
          <Tab.Screen 
            name="My Tasks" 
            options={{ tabBarLabel: '✅ My Tasks' }}
          >
            {() => (
              <PrioritizedScreen 
                todos={todos.filter(todo => todo.assignee === currentUser.id)} 
                setTodos={setTodos}
                onToggleComplete={toggleComplete}
                onRemoveTodo={removeTodo}
                onUpdateTodo={updateTodo}
                teamMembers={teamMembers}
                currentUser={currentUser}
              />
            )}
          </Tab.Screen>
          <Tab.Screen 
            name="Add Team Mates" 
            options={{ tabBarLabel: '➕ Team Mates' }}
          >
            {() => (
              <TeamMembersScreen 
                teamMembers={teamMembers}
                onAddTeamMember={addTeamMember}
                onRemoveTeamMember={removeTeamMember}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'left',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  addButton: {
    marginLeft: 10,
    backgroundColor: '#007bff',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  voiceButton: {
    backgroundColor: '#28a745',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  voiceButtonActive: {
    backgroundColor: '#dc3545',
  },
  voiceButtonText: {
    fontSize: 18,
  },
  listeningIndicator: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  listeningText: {
    color: '#856404',
    fontWeight: '600',
  },
  voiceModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  voiceModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  voiceModalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  voiceInputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  voiceInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginRight: 10,
  },
  modalMicButton: {
    backgroundColor: '#28a745',
    borderRadius: 10,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 80,
  },
  modalMicButtonActive: {
    backgroundColor: '#dc3545',
  },
  modalMicButtonText: {
    fontSize: 20,
  },
  mobileVoiceButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 80,
  },
  mobileVoiceButtonText: {
    fontSize: 24,
  },
  voiceModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  voiceModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#007bff',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  voiceTips: {
    width: '100%',
  },
  voiceTipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  voiceTipsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  priorityButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  dateButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  calendarModeRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginHorizontal: 5,
  },
  modeButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  modeButtonText: {
    color: '#333',
    fontSize: 14,
  },
  modeButtonTextActive: {
    color: '#fff',
    fontSize: 14,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkCircleCompleted: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#52c41a',
    backgroundColor: '#52c41a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkMark: {
    color: '#fff',
    fontSize: 16,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  todoRowCompleted: {
    backgroundColor: '#e8f5e9',
    opacity: 0.8,
  },
  todoText: {
    flex: 1,
    fontSize: 16,
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  removeButton: {
    marginLeft: 'auto',
    padding: 5,
  },
  removeX: {
    fontSize: 18,
    color: '#ff4444',
  },
  dayBlock: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  dayBlockDate: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  flagCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  completedBlock: {
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  prioGroupBlock: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  prioGroupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  prioHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  prioHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
  prioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  prioText: {
    fontSize: 14,
    color: '#333',
  },
  prioDate: {
    fontSize: 12,
    color: '#666',
  },
  greenCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1abc9c',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  grayDashCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#888',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  grayDash: {
    color: '#fff',
    fontSize: 16,
  },
  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dragHandle: {
    width: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 50,
  },
  // Team member styles
  addTeamMemberButton: {
    backgroundColor: '#007bff',
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  addTeamMemberButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  teamMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  memberInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  removeMemberButton: {
    padding: 5,
  },
  // Assignee styles
  assigneeSection: {
    marginTop: 15,
  },
  assigneeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  assigneeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  assigneeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
  },
  assigneeOptionSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  assigneeOptionText: {
    fontSize: 14,
    color: '#333',
  },
  assigneeOptionTextSelected: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  assigneeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  assigneeInitials: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  todoActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
  },
  editButton: {
    fontSize: 16,
  },
  removeButton: {
    fontSize: 16,
    color: '#ff4444',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  // Todo content styles
  todoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  todoTextContainer: {
    flex: 1,
  },
  todoDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  // User selection styles
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  userSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    width: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userInitials: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  noUsersText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // User indicator styles
  userIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  currentUserAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  currentUserInitials: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  currentUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  switchUserButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  switchUserButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  todoAssignee: {
    marginLeft: 10,
  },
  todoAssigneeAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todoAssigneeInitials: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Modal input styles
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    backgroundColor: '#fff',
    marginBottom: 15,
    fontSize: 16,
  },
  header: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Status Dropdown/Buttons
  statusContainer: {
    flexDirection: 'row',
    marginLeft: 10,
    marginRight: 10,
    gap: 10,
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  statusButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  statusButtonText: {
    color: '#333',
    fontSize: 14,
  },
  statusButtonTextActive: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

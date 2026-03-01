import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface Lesson {
  _id: string;
  coach: any;
  student: any;
  dateTime: string;
  duration: number;
  topic: string;
  status: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const response = await axios.get('/api/lessons', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        setLessons(response.data);
      } catch (error) {
        console.error('Error fetching lessons:', error);
      }
    };

    fetchLessons();
  }, []);

  const CoachDashboard = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Coach Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Upcoming Lessons
            </Typography>
            <List>
              {lessons
                .filter((lesson) => lesson.status === 'scheduled')
                .map((lesson) => (
                  <React.Fragment key={lesson._id}>
                    <ListItem>
                      <ListItemText
                        primary={`Student: ${lesson.student.username}`}
                        secondary={`
                          Date: ${new Date(lesson.dateTime).toLocaleString()}
                          Duration: ${lesson.duration} minutes
                          Topic: ${lesson.topic}
                        `}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Actions
            </Typography>
            <Button variant="contained" color="primary" fullWidth sx={{ mb: 2 }}>
              Schedule New Lesson
            </Button>
            <Button variant="outlined" color="primary" fullWidth>
              View Student Progress
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const StudentDashboard = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Student Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              My Lessons
            </Typography>
            <List>
              {lessons
                .filter((lesson) => lesson.status === 'scheduled')
                .map((lesson) => (
                  <React.Fragment key={lesson._id}>
                    <ListItem>
                      <ListItemText
                        primary={`Coach: ${lesson.coach.username}`}
                        secondary={`
                          Date: ${new Date(lesson.dateTime).toLocaleString()}
                          Duration: ${lesson.duration} minutes
                          Topic: ${lesson.topic}
                        `}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Actions
            </Typography>
            <Button variant="contained" color="primary" fullWidth sx={{ mb: 2 }}>
              Book New Lesson
            </Button>
            <Button variant="outlined" color="primary" fullWidth>
              View Progress
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {user?.role === 'coach' ? <CoachDashboard /> : <StudentDashboard />}
    </Container>
  );
};

export default Dashboard; 
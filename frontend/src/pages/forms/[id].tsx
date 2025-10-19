import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  LinearProgress,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  TextField,
  Slider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Form, Question, Response } from '@/types/forms';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';

export default function FormPage() {
  const router = useRouter();
  const { id } = router.query;
  const [currentStep, setCurrentStep] = useState(0);
  const [responseId, setResponseId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: form, isLoading: formLoading } = useQuery({
    queryKey: ['form', id],
    queryFn: async () => {
      const response = await api.get(`/forms/${id}`);
      return response.data;
    },
    enabled: !!id
  });

  const { data: existingResponse } = useQuery({
    queryKey: ['response', id],
    queryFn: async () => {
      const response = await api.get(`/responses/my-responses`);
      const responses = response.data;
      return responses.find((r: Response) => r.formId === id && r.status === 'in_progress');
    },
    enabled: !!id
  });

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm();

  const createResponseMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/responses/forms/${id}`, {});
      return response.data;
    },
    onSuccess: (data) => {
      setResponseId(data.id);
      toast.success('Response started');
    }
  });

  const saveResponseMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!responseId) return;
      await api.patch(`/responses/${responseId}`, data);
    },
    onSuccess: () => {
      toast.success('Progress saved');
    }
  });

  const submitResponseMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!responseId) return;
      await api.post(`/responses/${responseId}/submit`);
    },
    onSuccess: () => {
      toast.success('Response submitted successfully!');
      router.push('/dashboard');
    }
  });

  useEffect(() => {
    if (form && !existingResponse && !responseId) {
      createResponseMutation.mutate();
    } else if (existingResponse) {
      setResponseId(existingResponse.id);
    }
  }, [form, existingResponse, responseId]);

  const onSubmit = (data: any) => {
    const answers = Object.entries(data).map(([questionId, value]) => ({
      questionId,
      value,
    }));

    if (currentStep < (form?.questions?.length || 0) - 1) {
      // Save progress
      saveResponseMutation.mutate({ answers });
      setCurrentStep(currentStep + 1);
    } else {
      // Submit final response
      submitResponseMutation.mutate({ answers });
    }
  };

  const handleNext = () => {
    if (currentStep < (form?.questions?.length || 0) - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (formLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!form) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Form not found</Alert>
      </Container>
    );
  }

  const currentQuestion = form.questions[currentStep];
  const progress = ((currentStep + 1) / form.questions.length) * 100;

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h4" component="h1" gutterBottom>
            {form.title}
          </Typography>
          {form.description && (
            <Typography variant="body1" color="text.secondary" paragraph>
              {form.description}
            </Typography>
          )}

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Question {currentStep + 1} of {form.questions.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}% Complete
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progress} />
          </Box>

          {currentQuestion && (
            <form onSubmit={handleSubmit(onSubmit)}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {currentQuestion.text}
                  {currentQuestion.required && (
                    <Typography component="span" color="error">
                      {' '}*
                    </Typography>
                  )}
                </Typography>

                {renderQuestion(currentQuestion, control, errors)}
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  variant="outlined"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                >
                  Previous
                </Button>

                {currentStep === form.questions.length - 1 ? (
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={submitResponseMutation.isLoading}
                  >
                    {submitResponseMutation.isLoading ? 'Submitting...' : 'Submit'}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saveResponseMutation.isLoading}
                  >
                    {saveResponseMutation.isLoading ? 'Saving...' : 'Next'}
                  </Button>
                )}
              </Box>
            </form>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

function renderQuestion(question: Question, control: any, errors: any) {
  const { type, options, required } = question;

  switch (type) {
    case 'single_choice':
      return (
        <FormControl component="fieldset" required={required}>
          <RadioGroup>
            {options?.map((option) => (
              <FormControlLabel
                key={option.id}
                value={option.value}
                control={<Radio />}
                label={option.text}
              />
            ))}
          </RadioGroup>
        </FormControl>
      );

    case 'multiple_choice':
      return (
        <FormControl component="fieldset" required={required}>
          {options?.map((option) => (
            <FormControlLabel
              key={option.id}
              value={option.value}
              control={<Checkbox />}
              label={option.text}
            />
          ))}
        </FormControl>
      );

    case 'text_short':
      return (
        <TextField
          fullWidth
          variant="outlined"
          required={required}
          placeholder="Enter your answer"
        />
      );

    case 'text_long':
      return (
        <TextField
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          required={required}
          placeholder="Enter your answer"
        />
      );

    case 'likert_scale':
      return (
        <Box sx={{ px: 2 }}>
          <Slider
            defaultValue={3}
            min={1}
            max={5}
            step={1}
            marks={[
              { value: 1, label: '1' },
              { value: 2, label: '2' },
              { value: 3, label: '3' },
              { value: 4, label: '4' },
              { value: 5, label: '5' },
            ]}
            valueLabelDisplay="auto"
          />
        </Box>
      );

    case 'numeric_scale':
      return (
        <Box sx={{ px: 2 }}>
          <Slider
            defaultValue={5}
            min={1}
            max={10}
            step={1}
            marks={[
              { value: 1, label: '1' },
              { value: 5, label: '5' },
              { value: 10, label: '10' },
            ]}
            valueLabelDisplay="auto"
          />
        </Box>
      );

    case 'file_upload':
      return (
        <Box>
          <input
            type="file"
            accept="image/*,audio/*,.pdf"
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button variant="outlined" component="span">
              Upload File
            </Button>
          </label>
        </Box>
      );

    case 'instruction':
      return (
        <Alert severity="info">
          This is an instruction block. No response required.
        </Alert>
      );

    default:
      return <Typography>Unsupported question type</Typography>;
  }
}

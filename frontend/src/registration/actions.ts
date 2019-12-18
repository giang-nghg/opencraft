import { push } from 'connected-react-router';
import { OcimThunkAction } from 'global/types';
import { Action } from 'redux';
import { V2Api } from 'global/api';
import { toCamelCase } from 'utils/string_utils';
import { performLogin } from 'auth/actions';
import {
  RegistrationModel,
  RegistrationStateModel,
  RegistrationFeedbackModel
} from './models';

export enum Types {
  // Support action to update root state and clean error messages when users change fields
  CLEAR_ERROR_MESSAGE = 'CLEAR_ERROR_MESSAGE',
  // Data validation actions
  REGISTRATION_VALIDATION = 'REGISTRATION_VALIDATION',
  REGISTRATION_VALIDATION_SUCCESS = 'REGISTRATION_VALIDATION_SUCCESS',
  REGISTRATION_VALIDATION_FAILURE = 'REGISTRATION_VALIDATION_FAILURE',
  // Account registration
  REGISTRATION_SUBMIT = 'REGISTRATION_SUBMIT',
  REGISTRATION_SUCCESS = 'REGISTRATION_SUCCESS',
  REGISTRATION_FAILURE = 'REGISTRATION_FAILURE'
}

export interface FeedbackMessageChange extends Action {
  readonly type: Types.CLEAR_ERROR_MESSAGE;
  readonly field: keyof RegistrationStateModel;
}

export interface RegistrationValidation extends Action {
  readonly type: Types.REGISTRATION_VALIDATION;
}

export interface RegistrationValidationSuccess extends Action {
  readonly type: Types.REGISTRATION_VALIDATION_SUCCESS;
  readonly data: RegistrationModel;
}

export interface RegistrationValidationFailure extends Action {
  readonly type: Types.REGISTRATION_VALIDATION_FAILURE;
  readonly error: RegistrationFeedbackModel;
}

export interface SubmitRegistration extends Action {
  readonly type: Types.REGISTRATION_SUBMIT;
}

export interface RegistrationSuccess extends Action {
  readonly type: Types.REGISTRATION_SUCCESS;
  readonly data: RegistrationStateModel;
}

export interface RegistrationFailure extends Action {
  readonly type: Types.REGISTRATION_FAILURE;
  readonly error: RegistrationFeedbackModel;
}

export type ActionTypes =
  | FeedbackMessageChange
  | RegistrationValidation
  | RegistrationValidationSuccess
  | RegistrationValidationFailure
  | SubmitRegistration
  | RegistrationSuccess
  | RegistrationFailure;

export const clearErrorMessage = (
  field: keyof RegistrationStateModel
) => async (dispatch: any) => {
  dispatch({
    type: Types.CLEAR_ERROR_MESSAGE,
    field
  });
};

export const performValidationAndStore = (
  data: RegistrationModel,
  nextStep?: string
): OcimThunkAction<void> => async dispatch => {
  dispatch({
    type: Types.REGISTRATION_VALIDATION,
    data
  });
  const registrationData: any = { ...data };

  V2Api.instancesOpenedxConfigValidate({
    data: { ...registrationData }
  })
    .then(() => {
      // If validation succeeds, then save data and go to next step
      dispatch({ type: Types.REGISTRATION_VALIDATION_SUCCESS, data });
      if (nextStep) {
        dispatch(push(nextStep));
      }
    })
    .catch((e: any) => {
      e.json().then((feedback: any) => {
        // If validation fails, return error to form through state
        const error = { ...feedback };
        // Loop at each error message and join them.
        // Also convert keys from snake_case to camelCase
        Object.keys(error).forEach(key => {
          error[toCamelCase(key)] = error[key].join();
        });
        dispatch({
          type: Types.REGISTRATION_VALIDATION_FAILURE,
          error
        });
      });
    });
};

export const submitRegistration = (
  userData: RegistrationModel,
  instanceData: RegistrationModel,
  nextStep?: string
): OcimThunkAction<void> => async (dispatch: any) => {
  const userRegistrationData: any = { ...userData };
  const registrationFeedback: any = {};

  // Check for privacy policy and replace by current date
  if (userRegistrationData.acceptTOS) {
    delete userRegistrationData.acceptTOS;
    userRegistrationData.acceptedPrivacyPolicy = new Date();
  } else {
    registrationFeedback.acceptTOS =
      'You must accept the Terms of Service and Privacy policy.';
  }

  // Check if password confirmation is correct
  if (userRegistrationData.password === userRegistrationData.passwordConfirm) {
    delete userRegistrationData.passwordConfirm;
  } else {
    registrationFeedback.passwordConfirm =
      'The password confirmation should match the password from the field above.';
  }

  if (Object.entries(registrationFeedback).length === 0) {
    V2Api.accountsCreate({
      data: { ...userRegistrationData }
    })
      .then(() => {
        // Perform authentication and create new instance
        dispatch(
          performLogin({
            username: userRegistrationData.username,
            password: userRegistrationData.password
          })
        ).then(() => {
          // Create instance
          V2Api.instancesOpenedxConfigCreate({
            data: { ...instanceData }
          })
            .then(() => {
              dispatch({
                type: Types.REGISTRATION_VALIDATION_SUCCESS,
                userData
              });
              if (nextStep) {
                dispatch(push(nextStep));
              }
            })
            .catch(e => {
              console.log("This isn't supposed to happen!", e);
            });
        });
      })
      .catch((e: any) => {
        e.json().then((feedback: any) => {
          // If validation fails, return error to form through state
          const error = { ...feedback };
          // Loop at each error message and join them.
          // Also convert keys from snake_case to camelCase
          Object.keys(error).forEach(key => {
            error[toCamelCase(key)] = error[key].join();
          });
          dispatch({
            type: Types.REGISTRATION_VALIDATION_FAILURE,
            error
          });
        });
      });
  } else {
    // Failing local validation
    dispatch({
      type: Types.REGISTRATION_VALIDATION_FAILURE,
      error: { ...registrationFeedback }
    });
  }
};
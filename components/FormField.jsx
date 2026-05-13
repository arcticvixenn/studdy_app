import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import React, { useState } from 'react';

import { icons } from '../constants';

const FormField = ({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles = '',
  multiline = false,
  numberOfLines = 1,
  inputContainerStyles = '',
  inputStyles = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPasswordField = title === 'Password';

  return (
    <View className={`space-y-2 ${otherStyles}`}>
      <Text className="text-base text-gray-100 font-pmedium">{title}</Text>

      <View
        className={`w-full px-4 rounded-2xl flex-row ${
          multiline
            ? 'min-h-[160px] py-4 items-start'
            : 'h-16 items-center'
        } ${
          isFocused ? 'border-secondary' : 'border-black-200'
        } bg-black-100 border-2 ${inputContainerStyles}`}
      >
        <TextInput
          className={`flex-1 text-white font-psemibold text-base ${inputStyles}`}
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#7b7b8b"
          onChangeText={handleChangeText}
          secureTextEntry={isPasswordField && !showPassword}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {isPasswordField && !multiline && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Image
              source={!showPassword ? icons.eye : icons.eyeHide}
              className="w-6 h-6"
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default FormField;
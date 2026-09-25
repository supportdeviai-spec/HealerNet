<?php

namespace App\Http\Requests\Admin;

use App\Enums\Status;
use App\Support\MobileRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCountryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'unique:countries,name'],
            'code' => ['required', 'string', 'max:10', 'unique:countries,code'],
            'phone_code' => ['nullable', 'string', 'max:10', MobileRules::rule('phoneCode', MobileRules::PHONE_CODE_ERROR)],
            'mobile_length' => ['nullable', 'string', 'max:10', MobileRules::rule('length', MobileRules::LENGTH_ERROR)],
            'mobile_starts_with' => ['nullable', 'string', 'max:50', MobileRules::rule('startsWith', MobileRules::STARTS_WITH_ERROR)],
            'region_label' => ['nullable', 'string', 'max:50'],
            'city_label' => ['nullable', 'string', 'max:50'],
            'status' => ['required', Rule::enum(Status::class)],
        ];
    }
}

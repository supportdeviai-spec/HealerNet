<?php

namespace App\Http\Requests\Admin;

use App\Enums\Status;
use App\Models\City;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $regionId = $this->input('region_id');
        $status = $this->input('status');
        $groupId = $this->input('whatsapp_group_id');

        $merged = [];

        if ($regionId !== null && $regionId !== '') {
            $merged['region_id'] = (int) $regionId;
        }

        if (is_array($status) && isset($status['value'])) {
            $merged['status'] = strtolower((string) $status['value']);
        } elseif (is_string($status)) {
            $merged['status'] = strtolower($status);
        }

        if ($groupId === '' || $groupId === 'null' || $groupId === 'undefined') {
            $merged['whatsapp_group_id'] = null;
        }

        if ($this->has('name') && is_string($this->input('name'))) {
            $merged['name'] = trim($this->input('name'));
        }

        if ($merged !== []) {
            $this->merge($merged);
        }
    }

    public function rules(): array
    {
        $city = $this->route('city');
        $cityId = $city instanceof City ? $city->getKey() : $city;
        $regionId = $this->input('region_id');

        return [
            'region_id' => ['required', 'integer', 'exists:regions,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('cities', 'name')
                    ->where(fn ($q) => $q->where('region_id', $regionId))
                    ->ignore($cityId, 'id'),
            ],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'status' => ['required', Rule::enum(Status::class)],
            'whatsapp_group_id' => ['nullable', 'uuid', 'exists:whatsapp_groups,id'],
        ];
    }
}
